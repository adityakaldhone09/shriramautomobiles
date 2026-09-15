import type { Server } from 'node:http';
import app from '../../artifacts/api-server/src/app.ts';
import { db } from '../../artifacts/api-server/src/lib/db.ts';
import { servicePartsTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

async function runTests() {
  console.log('🚀 Starting Service Intelligence Integration Tests...');

  let server: Server;
  const port = await new Promise<number>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        resolve(address.port);
      } else {
        throw new Error('Failed to bind ephemeral test port');
      }
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`🌐 Test server listening on ${baseUrl}`);

  let customerCookie = '';
  let adminCookie = '';

  try {
    // 1. Register a test customer
    console.log('\n--- 1. Testing Customer Registration & Auth ---');
    const customerPhone = `9820${Math.floor(100000 + Math.random() * 900000)}`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Suresh Patil',
        phone: customerPhone,
        email: `suresh.${customerPhone}@example.com`,
        password: 'Password123!',
      }),
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(`Customer registration failed: ${JSON.stringify(regData)}`);
    console.log('✅ Customer registered successfully:', regData.data.user.name);

    const rawCookies = regRes.headers.get('set-cookie');
    if (rawCookies) {
      customerCookie = rawCookies.split(';')[0];
    }

    // Also create/login an ADMIN/STAFF user
    const adminPhone = `9821${Math.floor(100000 + Math.random() * 900000)}`;
    const adminRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Shop Supervisor',
        phone: adminPhone,
        email: `supervisor.${adminPhone}@example.com`,
        password: 'Password123!',
      }),
    });
    const adminRegData = await adminRegRes.json();
    if (!adminRegRes.ok) throw new Error(`Admin registration failed: ${JSON.stringify(adminRegData)}`);
    
    // Elevate admin user to ADMIN role in db
    const { usersTable } = await import('@workspace/db/schema');
    await db.update(usersTable).set({ role: 'ADMIN' }).where(eq(usersTable.id, adminRegData.data.user.id));
    
    // Login admin to get session cookie with ADMIN role
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminPhone,
        password: 'Password123!',
      }),
    });
    const adminRawCookie = adminLoginRes.headers.get('set-cookie');
    if (adminRawCookie) adminCookie = adminRawCookie.split(';')[0];
    console.log('✅ Admin user created and authenticated');

    // 2. Add customer vehicle: Honda Activa 6G
    console.log('\n--- 2. Testing Customer Vehicle Management ---');
    // Fetch vehicle models
    const modelsRes = await fetch(`${baseUrl}/api/vehicle-models`);
    const modelsData = await modelsRes.json();
    console.log('modelsData response:', JSON.stringify(modelsData));
    if (!modelsRes.ok || !modelsData.data?.length) throw new Error('Failed to fetch vehicle models');
    
    const activaModel = modelsData.data.find((m: any) => m.model.toLowerCase().includes('activa'));
    if (!activaModel) throw new Error('Honda Activa model not found in catalog');
    console.log(`✅ Found model: ${activaModel.brand} ${activaModel.model} (Type: ${activaModel.vehicleType})`);

    const addVehicleRes = await fetch(`${baseUrl}/api/account/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: customerCookie,
      },
      body: JSON.stringify({
        vehicleModelId: activaModel.id,
        brand: activaModel.brand,
        model: activaModel.model,
        vehicleType: activaModel.vehicleType,
        year: 2022,
        registrationNumber: 'MH 13 CZ 8899',
        color: 'Pearl Siren Blue',
        currentOdometer: 14250,
      }),
    });
    const addVehicleData = await addVehicleRes.json();
    if (!addVehicleRes.ok) throw new Error(`Add vehicle failed: ${JSON.stringify(addVehicleData)}`);
    const customerVehicle = addVehicleData.data;
    console.log(`✅ Customer vehicle added (ID: ${customerVehicle.id}, Reg: ${customerVehicle.registrationNumber})`);

    // 3. Test Service Symptoms List & Intelligence Recommendation
    console.log('\n--- 3. Testing Service Intelligence & Vehicle Separation ---');
    const symptomsRes = await fetch(`${baseUrl}/api/service-symptoms`);
    const symptomsData = await symptomsRes.json();
    if (!symptomsRes.ok || !symptomsData.data?.length) throw new Error('Failed to fetch symptoms');

    const pickupSymptom = symptomsData.data.find((s: any) => s.slug === 'low-pickup');
    if (!pickupSymptom) throw new Error('Low Pickup symptom not found');
    console.log(`✅ Found Symptom: "${pickupSymptom.name}" (Slug: ${pickupSymptom.slug})`);

    // Query recommendations for Activa 6G + Low Pickup
    const recRes = await fetch(
      `${baseUrl}/api/service-recommendations?vehicleModelId=${activaModel.id}&symptomId=${pickupSymptom.id}`
    );
    const recData = await recRes.json();
    if (!recRes.ok) throw new Error(`Recommendations failed: ${JSON.stringify(recData)}`);

    console.log(`\n📋 Recommendations for ${activaModel.brand} ${activaModel.model}:`);
    console.log(`   - Recommended Services count: ${recData.data.services.length}`);
    console.log(`   - Likely Parts count: ${recData.data.parts.length}`);

    // Verify Scooter vs Motorcycle strict separation:
    // Honda Activa is a SCOOTER:
    // - MUST include CVT belt or CVT rollers or scooter clutch shoe
    // - MUST NOT include motorcycle drive chain, sprockets, or clutch cable
    const partNames: string[] = recData.data.parts.map((p: any) => p.name.toLowerCase());
    const partSkus: string[] = recData.data.parts.map((p: any) => p.sku.toLowerCase());

    const hasCvtOrScooterPart = partNames.some((n) => n.includes('cvt') || n.includes('variator') || n.includes('belt') || n.includes('shoe'));
    const hasChainSprocket = partNames.some((n) => n.includes('chain') || n.includes('sprocket'));

    if (!hasCvtOrScooterPart) {
      throw new Error('Scooter recommendation failed: Expected CVT / belt / variator parts for Honda Activa!');
    }
    if (hasChainSprocket) {
      throw new Error('Scooter isolation violated: Found motorcycle chain / sprocket recommended for a scooter!');
    }
    console.log('✅ Strict Vehicle Type Separation Verified: Scooter received CVT parts and ZERO motorcycle chains!');

    // 4. Test AI / Free-Text Diagnose Complaint
    console.log('\n--- 4. Testing AI / Free-Text Symptom Diagnosis ---');
    const diagRes = await fetch(`${baseUrl}/api/ai/diagnose-symptoms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaint: 'गाडी पिकअप घेत नाही आणि स्पीड वाढताना व्हायब्रेशन होते',
        vehicleType: 'SCOOTER',
      }),
    });
    const diagData = await diagRes.json();
    if (!diagRes.ok) throw new Error(`Diagnosis failed: ${JSON.stringify(diagData)}`);
    console.log(`✅ Diagnosed Symptom: "${diagData.data.symptom?.name}" (Confidence: ${diagData.data.confidence})`);
    console.log(`   Reasoning: ${diagData.data.reasoning}`);

    // 5. Test Available Mechanics and Slots
    console.log('\n--- 5. Testing Slots and Mechanics ---');
    const mechanicsRes = await fetch(`${baseUrl}/api/mechanics/available`);
    const mechanicsData = await mechanicsRes.json();
    if (!mechanicsRes.ok || !mechanicsData.data?.length) throw new Error('Mechanics lookup failed');
    const selectedMechanic = mechanicsData.data[0];
    console.log(`✅ Available Mechanic: ${selectedMechanic.name} (Rating: ${selectedMechanic.rating})`);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const slotsRes = await fetch(`${baseUrl}/api/slots?date=${dateStr}`);
    const slotsData = await slotsRes.json();
    if (!slotsRes.ok || !slotsData.data?.length) throw new Error('Slots lookup failed');
    const selectedSlot = slotsData.data[0].timeSlot || slotsData.data[0].slot;
    console.log(`✅ Available Slot for ${dateStr}: ${selectedSlot}`);

    // 6. Create Service Booking with SAB-YYYY-XXXXXX Reference
    console.log('\n--- 6. Testing Service Booking Creation ---');
    const recommendedService = recData.data.services[0];
    const bookingRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: customerCookie,
      },
      body: JSON.stringify({
        fullName: 'Suresh Patil',
        phone: customerPhone,
        email: `suresh.${customerPhone}@example.com`,
        customerVehicleId: customerVehicle.id,
        vehicleBrand: customerVehicle.brand,
        vehicleModel: customerVehicle.model,
        vehicleType: customerVehicle.vehicleType,
        registrationNumber: customerVehicle.registrationNumber,
        symptomId: pickupSymptom.id,
        selectedServices: [recommendedService.serviceId || 'srv-cvt'],
        appointmentDate: dateStr,
        timeSlot: selectedSlot,
        mechanicId: selectedMechanic.id,
        problemDescription: 'Experiencing slow pickup on flyovers and strange shudder from transmission.',
      }),
    });
    const bookingData = await bookingRes.json();
    if (!bookingRes.ok) throw new Error(`Booking creation failed: ${JSON.stringify(bookingData)}`);
    const booking = bookingData.data;
    console.log(`✅ Booking Created: Reference #${booking.bookingNumber || booking.bookingId} (Status: ${booking.status})`);

    if (!booking.bookingNumber?.startsWith('SAB-')) {
      throw new Error(`Invalid booking reference format: ${booking.bookingNumber}`);
    }

    // 7. Mechanic conducts inspection
    console.log('\n--- 7. Testing Mechanic Inspection ---');
    const inspectionRes = await fetch(`${baseUrl}/api/admin/bookings/${booking.id}/inspection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        notes: 'Visual and mechanical inspection complete. CVT belt is badly cracked and variator rollers have flat spots.',
        items: [
          {
            partName: 'Engine Oil',
            status: 'CHECKED',
            conditionNotes: 'Oil level good, recently changed',
            estimatedCost: 0,
          },
          {
            partSku: 'SKU-BELT-ACTIVA-6G',
            partName: 'Honda Activa 6G CVT Drive Belt',
            status: 'REQUIRES_REPLACEMENT',
            conditionNotes: 'Severe rubber cracking, imminent risk of snap',
            estimatedCost: 550,
          },
          {
            partSku: 'SKU-ROLLER-ACTIVA',
            partName: 'CVT Variator Rollers Set',
            status: 'REQUIRES_REPLACEMENT',
            conditionNotes: 'Flat spots causing vibration and loss of acceleration',
            estimatedCost: 280,
          },
          {
            partName: 'Clutch Shoe Assembly',
            status: 'NOT_REQUIRED',
            conditionNotes: 'Sufficient friction material remaining',
            estimatedCost: 0,
          },
        ],
      }),
    });
    const inspectionData = await inspectionRes.json();
    if (!inspectionRes.ok) throw new Error(`Inspection failed: ${JSON.stringify(inspectionData)}`);
    console.log(`✅ Inspection recorded: ${inspectionData.data.items?.length} items evaluated`);

    // 8. Admin / Staff creates official Estimate
    console.log('\n--- 8. Testing Server-Side Estimate Generation ---');
    // Check initial stock of the belt
    const [beltBefore] = await db.select().from(servicePartsTable).where(eq(servicePartsTable.sku, 'PART-CVT-BLT'));
    const initialStock = beltBefore?.stockQuantity ?? 10;
    console.log(`   Initial stock for ${beltBefore?.name}: ${initialStock}`);

    const estimateRes = await fetch(`${baseUrl}/api/admin/bookings/${booking.id}/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        labourCharges: 350,
        discountAmount: 50,
        taxPercent: 18,
        mechanicNotes: 'Replaced CVT belt and rollers with genuine OEM parts. Includes drive clutch cleaning and grease pack.',
        items: [
          {
            itemType: 'PART',
            partId: beltBefore?.id,
            description: 'Honda Activa 6G CVT Drive Belt (Genuine Bando)',
            quantity: 1,
            unitPrice: beltBefore ? Number(beltBefore.price) : 550,
          },
        ],
      }),
    });
    const estimateData = await estimateRes.json();
    if (!estimateRes.ok) throw new Error(`Estimate creation failed: ${JSON.stringify(estimateData)}`);
    const estimate = estimateData.data;
    console.log(`✅ Official Estimate Created: ID #${estimate.id} (Status: ${estimate.status})`);
    console.log(`   Labour: ₹${estimate.labourCharges}, Parts: ₹${estimate.partsTotal}, Total: ₹${estimate.totalAmount}`);

    // Verify booking status shifted to ESTIMATE_SHARED
    const checkBookingRes = await fetch(`${baseUrl}/api/bookings/${booking.id}`);
    const checkBookingData = await checkBookingRes.json();
    if (checkBookingData.data.status !== 'ESTIMATE_SHARED' && checkBookingData.data.status !== 'CUSTOMER_APPROVAL_REQUIRED') {
      throw new Error(`Expected booking status ESTIMATE_SHARED or CUSTOMER_APPROVAL_REQUIRED, got: ${checkBookingData.data.status}`);
    }
    console.log(`✅ Booking Status automatically updated to: ${checkBookingData.data.status}`);

    // 9. Customer approves estimate
    console.log('\n--- 9. Testing Customer Estimate Approval & Stock Decrement ---');
    const approveRes = await fetch(`${baseUrl}/api/account/estimates/${estimate.id}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: customerCookie,
      },
      body: JSON.stringify({
        notes: 'Approved. Please proceed with the service.',
      }),
    });
    const approveData = await approveRes.json();
    if (!approveRes.ok) throw new Error(`Estimate approval failed: ${JSON.stringify(approveData)}`);
    console.log(`✅ Estimate Approved by Customer! Status: ${approveData.data.status}`);

    // Verify booking moved to IN_SERVICE
    const postApproveBookingRes = await fetch(`${baseUrl}/api/bookings/${booking.id}`);
    const postApproveBookingData = await postApproveBookingRes.json();
    if (postApproveBookingData.data.status !== 'IN_SERVICE') {
      throw new Error(`Expected booking status IN_SERVICE, got: ${postApproveBookingData.data.status}`);
    }
    console.log(`✅ Booking Status transitioned to: ${postApproveBookingData.data.status}`);

    // Verify inventory stock was decremented atomically
    const [beltAfter] = await db.select().from(servicePartsTable).where(eq(servicePartsTable.sku, 'PART-CVT-BLT'));
    const finalStock = beltAfter?.stockQuantity ?? 0;
    console.log(`   Final stock for ${beltAfter?.name}: ${finalStock} (Decremented from ${initialStock})`);
    if (finalStock !== initialStock - 1) {
      throw new Error(`Stock decrement failed: Expected ${initialStock - 1}, but found ${finalStock}`);
    }
    console.log('✅ Inventory Stock was atomically decremented upon customer approval!');

    // 10. Test Compatible Parts endpoint for Shop
    console.log('\n--- 10. Testing Compatible Parts for Shop ---');
    const compatPartsRes = await fetch(`${baseUrl}/api/parts/compatible/${activaModel.id}`);
    const compatPartsData = await compatPartsRes.json();
    if (!compatPartsRes.ok) throw new Error(`Compatible parts fetch failed: ${JSON.stringify(compatPartsData)}`);
    console.log(`✅ Compatible parts retrieved for ${activaModel.model}: ${compatPartsData.data?.length} items`);
    const hasConfidence = compatPartsData.data.every((p: any) => p.fitmentConfidence);
    if (!hasConfidence) throw new Error('Fitment confidence missing from compatible parts');
    console.log('✅ Fitment confidence badges present on all returned parts');

    console.log('\n🎉 ALL SERVICE INTELLIGENCE INTEGRATION TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
