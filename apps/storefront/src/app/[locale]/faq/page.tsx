import { notFound } from 'next/navigation';
import { FaqAccordion, type FaqAccordionLabels, type FaqItem } from '@/components/content';
import { isLocale, type Locale } from '@/lib/i18n';
import { faqJsonLd } from '@/lib/seo/json-ld';

export const metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about orders, delivery, payment, returns and account.',
};

export default function FaqPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const items: FaqItem[] = bn
    ? [
        { id: 'q1', category: 'অর্ডার ও পেমেন্ট', question: 'কীভাবে অর্ডার করব?', answer: 'পণ্য ব্রাউজ করুন, "কার্টে যোগ করুন" ক্লিক করুন, তারপর কার্ট থেকে "চেকআউট" চয়ন করুন। bKash, Nagad, কার্ড অথবা ক্যাশ অন ডেলিভারিতে পেমেন্ট করা যাবে।' },
        { id: 'q2', category: 'অর্ডার ও পেমেন্ট', question: 'কোন পেমেন্ট পদ্ধতি গ্রহণ করা হয়?', answer: 'bKash, Nagad, Visa, Mastercard, AMEX (SSLCommerz-এর মাধ্যমে), এবং ক্যাশ অন ডেলিভারি (সমর্থিত এলাকায়)।' },
        { id: 'q3', category: 'ডেলিভারি', question: 'ডেলিভারিতে কত দিন লাগে?', answer: 'ঢাকা মেট্রো: একই দিন বা পরদিন। ঢাকার বাইরে: ২-৪ কার্যদিবস। প্রতিটি পণ্যের ডেলিভারি এস্টিমেট চেকআউটে দেখানো হয়।' },
        { id: 'q4', category: 'ডেলিভারি', question: 'ডেলিভারি চার্জ কত?', answer: 'ঢাকা মেট্রোতে ৪৯৯৳+ অর্ডারে ডেলিভারি ফ্রি। ঢাকায় ৬০৳, ঢাকার বাইরে ১২০৳ স্ট্যান্ডার্ড ডেলিভারি চার্জ।' },
        { id: 'q5', category: 'রিটার্ন ও রিফান্ড', question: 'রিটার্ন পলিসি কী?', answer: 'ডেলিভারির ৭ দিনের মধ্যে বেশিরভাগ পণ্য অক্ষত ও মূল প্যাকেজিংয়ে ফেরত দেওয়া যায়। কিছু ক্যাটাগরি (পচনশীল, ব্যক্তিগত যত্ন) ফেরতযোগ্য নয়।' },
        { id: 'q6', category: 'রিটার্ন ও রিফান্ড', question: 'রিটার্ন কীভাবে শুরু করব?', answer: 'আমার অর্ডার → পণ্য নির্বাচন → "রিটার্ন" ক্লিক করুন → কারণ ও রিফান্ড পদ্ধতি নির্বাচন করুন → পিকআপ সিডিউল করুন। কুরিয়ার ৪৮ ঘণ্টায় সংগ্রহ করবে।' },
        { id: 'q7', category: 'অ্যাকাউন্ট ও নিরাপত্তা', question: 'পাসওয়ার্ড রিসেট কীভাবে করব?', answer: 'সাইন-ইন পেজে "পাসওয়ার্ড ভুলে গেছেন?" ক্লিক করুন, মোবাইল বা ইমেইল দিন, OTP যাচাই করুন — নতুন পাসওয়ার্ড সেট করুন।' },
        { id: 'q8', category: 'অ্যাকাউন্ট ও নিরাপত্তা', question: 'পেমেন্ট তথ্য কি নিরাপদ?', answer: 'হ্যাঁ। SSLCommerz-এর মাধ্যমে PCI-DSS সম্মত টোকেনাইজড পেমেন্ট ব্যবহার করা হয়। কার্ড তথ্য আমাদের সার্ভারে সংরক্ষিত হয় না।' },
      ]
    : [
        { id: 'q1', category: 'Ordering & Payment', question: 'How do I place an order?', answer: 'Browse or search for products, click "Add to Cart", then go to your cart and select "Proceed to Checkout". You can pay with bKash, Nagad, card via SSLCommerz, or Cash on Delivery (COD).' },
        { id: 'q2', category: 'Ordering & Payment', question: 'What payment methods do you accept?', answer: 'We accept bKash, Nagad, Visa, Mastercard, AMEX via SSLCommerz, and Cash on Delivery in supported zones.' },
        { id: 'q3', category: 'Delivery & Shipping', question: 'How long will delivery take?', answer: 'Dhaka Metro: same day or next day. Rest of Bangladesh: 2-4 business days. Delivery estimates are shown per product on the checkout page.' },
        { id: 'q4', category: 'Delivery & Shipping', question: 'Do you charge for delivery?', answer: 'Delivery is FREE on eligible orders over ৳499 in Dhaka Metro. Standard delivery charge ৳60 within Dhaka, ৳120 outside Dhaka.' },
        { id: 'q5', category: 'Returns & Refunds', question: 'What is the return policy?', answer: 'Most items can be returned within 7 days of delivery for a full refund. Items must be unused, in original packaging, with all tags attached. Some categories (perishable food, personal care) are non-returnable.' },
        { id: 'q6', category: 'Returns & Refunds', question: 'How do I initiate a return?', answer: 'Go to Your Orders → find the item → click "Return items" → choose a reason and refund method → schedule a pickup. Our courier will collect the item within 48 hours.' },
        { id: 'q7', category: 'Account & Security', question: 'How do I reset my password?', answer: 'On the sign-in page, click "Forgot your password?", enter your mobile number or email, and follow the OTP verification. You can set a new password in seconds.' },
        { id: 'q8', category: 'Account & Security', question: 'Is my payment information secure?', answer: 'Yes. NoLimitShopping uses PCI-DSS compliant, tokenised payment via SSLCommerz. We never store your card details on our servers.' },
      ];

  const labels: FaqAccordionLabels = {
    searchPlaceholder: bn ? 'প্রশ্ন খুঁজুন…' : 'Search questions…',
    noResults: bn ? 'কোনো প্রশ্ন পাওয়া যায়নি' : 'No matching questions',
    helpful: bn ? 'এটা কি সহায়ক ছিল?' : 'Was this helpful?',
  };

  const jsonLd = faqJsonLd(
    items.map((it) => ({ question: it.question, answer: it.answer })),
  );

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 style={{ maxWidth: 720, margin: '32px auto 0', padding: '0 24px', fontSize: 28, fontWeight: 700 }}>
        {bn ? 'সাধারণ প্রশ্ন (FAQ)' : 'Frequently Asked Questions'}
      </h1>
      <FaqAccordion items={items} labels={labels} />
    </main>
  );
}