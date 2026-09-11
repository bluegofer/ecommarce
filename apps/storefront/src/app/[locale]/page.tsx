import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, interpolate } from '@/lib/i18n';
import { Header, Footer, Breadcrumbs } from '@/components/layout';
import { ProductCard } from '@/components/product';
import { Badge, PriceBlock, RatingStars, SkeletonCard, EmptyState, Pagination } from '@/components/ui';

/**
 * Step 7 component gallery — renders every global component once.
 * Serves as the axe-core audit target (AC-101) and visual-check surface (AC-100).
 * Real home page (C1) is built in Step 8.
 */
export default function LocaleHomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const t = getDictionary(locale);

  const navLinks = [
    { label: t['nav.deals'], href: `/${locale}/deals` },
    { label: t['nav.best'], href: `/${locale}/s?k=best` },
    { label: t['nav.new'], href: `/${locale}/s?k=new` },
    { label: 'Electronics', href: `/${locale}/c/electronics` },
    { label: 'Fashion', href: `/${locale}/c/fashion` },
    { label: 'Home & Kitchen', href: `/${locale}/c/home` },
  ];

  return (
    <>
      <a href="#main" className="skipLink">Skip to content</a>
      <Header
        locale={locale}
        labels={{
          deliverTo: t['header.deliver_to'],
          deliverPlaceholder: locale === 'bn' ? 'ঢাকা ১২১২' : 'Dhaka 1212',
          searchPlaceholder: t['search.placeholder'],
          searchAll: t['nav.all'],
          searchIn: `SEARCH FOR {q} IN {category}`,
          helloSignIn: t['auth.signin'],
          accountLists: t['header.account'],
          returns: locale === 'bn' ? 'রিটার্ন' : 'Returns',
          orders: t['header.orders'],
          cart: t['header.cart'],
          languageBn: 'বাংলা',
          languageEn: 'EN',
          megaMenu: {
            greeting: t['auth.signin'],
            trending: 'Trending',
            bestSellers: t['nav.best'],
            newReleases: t['nav.new'],
            todayDeals: t['nav.deals'],
            shopByCategory: 'Shop by Category',
            helpServices: 'Help & Services',
            customerService: 'Customer Service',
            languageSwitch: locale === 'bn' ? 'English' : 'বাংলা',
            empty: 'No categories yet',
            back: 'Back',
            mainMenu: 'Main Menu',
          },
        }}
        navLinks={navLinks}
        categories={[
          { id: '1', label: 'Electronics', href: `/${locale}/c/electronics`, children: [
            { id: '1a', label: 'Headphones', href: `/${locale}/c/headphones` },
            { id: '1b', label: 'Smartphones', href: `/${locale}/c/smartphones` },
          ]},
          { id: '2', label: 'Fashion', href: `/${locale}/c/fashion` },
          { id: '3', label: 'Home & Kitchen', href: `/${locale}/c/home` },
        ]}
        alternateLocaleHref={`/${locale === 'bn' ? 'en' : 'bn'}`}
      />

      <main id="main" style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px 48px' }}>
        <Breadcrumbs
          items={[
            { label: 'Home', href: `/${locale}` },
            { label: 'Component gallery' },
          ]}
          locale={locale}
        />

        <h1 style={{ marginTop: 16, fontFamily: 'var(--sk-font-en)' }}>SkyMart · Step 7 gallery</h1>
        <p style={{ color: 'var(--sk-muted)', fontFamily: 'var(--sk-font-en)' }}>
          Locale = <strong>{locale}</strong> · All global components rendered once for visual + axe audit.
        </p>

        {/* Badges */}
        <Section title="Badges (B10)">
          <div style={row}>
            <Badge kind="discount" percent={45} />
            <Badge kind="best-seller">Best Seller</Badge>
            <Badge kind="new">New</Badge>
            <Badge kind="low-stock">Only 3 left</Badge>
            <Badge kind="out-of-stock">Out of Stock</Badge>
            <Badge kind="free-delivery">Free Delivery</Badge>
            <Badge kind="deal-timer" timer="07:42:18" />
            <Badge kind="in-stock">In Stock</Badge>
          </div>
        </Section>

        {/* Price blocks */}
        <Section title="Price block (B10)">
          <div style={row}>
            <PriceBlock pricePoisha={219900} listPricePoisha={399900} size="card" locale={locale} />
            <PriceBlock pricePoisha={219900} listPricePoisha={399900} size="pdp" locale={locale} />
            <PriceBlock pricePoisha={129900} size="card" locale={locale} />
          </div>
        </Section>

        {/* Rating stars */}
        <Section title="Rating stars (B9)">
          <div style={row}>
            <RatingStars average={4.4} count={4321} size={16} locale={locale} />
            <RatingStars average={3.5} count={248} size={20} locale={locale} />
            <RatingStars average={0} count={0} size={16} locale={locale} />
          </div>
        </Section>

        {/* Product cards */}
        <Section title="Product cards (C2)">
          <div style={grid}>
            <ProductCard
              variantId="v1"
              slug="demo-headphones"
              title="Wireless Over-Ear Headphones with Active Noise Cancellation, 35h Playback"
              thumbnailUrl={null}
              pricePoisha={219900}
              listPricePoisha={399900}
              ratingAverage={4.4}
              ratingCount={4321}
              inStock
              freeDelivery
              bestSeller
              locale={locale}
              t={{
                addToCart: t['card.add_to_cart'],
                outOfStock: t['product.out_of_stock'],
                inStock: t['product.in_stock'],
                lowStock: t['product.low_stock'],
                freeDelivery: t['product.free_delivery'],
                deliveryBy: t['product.eta'],
                wishlistAdd: t['card.wishlist_add'],
                wishlistRemove: t['card.wishlist_remove'],
                addedToCart: t['cart.added'],
              }}
            />
            <ProductCard
              variantId="v2"
              slug="demo-watch"
              title="Smart Watch Series X with Heart Rate Monitor & GPS, 7-day battery"
              thumbnailUrl={null}
              pricePoisha={349900}
              listPricePoisha={560000}
              ratingAverage={5}
              ratingCount={2110}
              inStock
              lowStock
              lowStockQty={3}
              isNew
              locale={locale}
              t={{
                addToCart: t['card.add_to_cart'],
                outOfStock: t['product.out_of_stock'],
                inStock: t['product.in_stock'],
                lowStock: t['product.low_stock'],
                freeDelivery: t['product.free_delivery'],
                deliveryBy: t['product.eta'],
                wishlistAdd: t['card.wishlist_add'],
                wishlistRemove: t['card.wishlist_remove'],
                addedToCart: t['cart.added'],
              }}
            />
            <ProductCard
              variantId="v3"
              slug="demo-oos"
              title="Non-Stick Cookware Set 7-piece Induction Safe"
              thumbnailUrl={null}
              pricePoisha={189900}
              listPricePoisha={399900}
              ratingAverage={4.3}
              ratingCount={890}
              inStock={false}
              locale={locale}
              t={{
                addToCart: t['card.add_to_cart'],
                outOfStock: t['product.out_of_stock'],
                inStock: t['product.in_stock'],
                lowStock: t['product.low_stock'],
                freeDelivery: t['product.free_delivery'],
                deliveryBy: t['product.eta'],
                wishlistAdd: t['card.wishlist_add'],
                wishlistRemove: t['card.wishlist_remove'],
                addedToCart: t['cart.added'],
              }}
            />
            <SkeletonCard />
          </div>
        </Section>

        {/* Pagination */}
        <Section title="Pagination (B7)">
          <Pagination page={2} totalPages={12} />
        </Section>

        {/* Empty state */}
        <Section title="Empty state (B8)">
          <EmptyState
            title={t['cart.empty']}
            body={interpolate('Locale = {loc}', { loc: locale })}
          />
        </Section>
      </main>

      <Footer
        locale={locale}
        labels={{
          backTop: t['common.back_top'],
          about: t['footer.about'],
          contact: t['footer.contact'],
          faq: t['footer.faq'],
          privacy: t['footer.privacy'],
          terms: t['footer.terms'],
          returns: t['footer.returns'],
          language: 'Language',
          currency: 'Currency',
          country: 'Country',
          brand: 'SkyMart',
        }}
        columns={[
          { heading: t['footer.about'], links: [
            { label: 'About', href: `/${locale}/pages/about` },
            { label: 'Careers', href: `/${locale}/pages/careers` },
          ]},
          { heading: 'Help', links: [
            { label: t['footer.contact'], href: `/${locale}/pages/contact` },
            { label: t['footer.faq'], href: `/${locale}/pages/faq` },
          ]},
          { heading: 'Policies', links: [
            { label: t['footer.privacy'], href: `/${locale}/pages/privacy` },
            { label: t['footer.terms'], href: `/${locale}/pages/terms` },
            { label: t['footer.returns'], href: `/${locale}/pages/returns` },
          ]},
          { heading: 'Account', links: [
            { label: t['account.title'], href: `/${locale}/account` },
            { label: t['header.orders'], href: `/${locale}/account/orders` },
          ]},
        ]}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontFamily: 'var(--sk-font-en)', fontSize: 18, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}

const row: React.CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' };
const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 16,
};