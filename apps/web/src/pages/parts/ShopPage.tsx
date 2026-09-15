import { Shell } from '@/components/layout/Shell';
import { CompatiblePartsShop } from '@/components/parts/CompatiblePartsShop';

export function ShopPage() {
  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CompatiblePartsShop />
      </main>
    </Shell>
  );
}

export default ShopPage;
