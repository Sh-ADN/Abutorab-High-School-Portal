import { NoticeRecord, Student, SubjectMarkRecord } from '../types/school';

export interface HeroSlideItem {
  id: string;
  imageUrl: string;
  caption: string;
  subCaption: string;
}

export interface LeadershipProfile {
  id: string;
  name: string;
  roleTitle: string;
  qualification?: string;
  photoUrl?: string;
  shortQuote: string;
  fullMessage: string[];
  badgeColor: 'teal' | 'emerald' | 'amber';
}

export interface PublicTeacherDirectoryItem {
  id: string;
  serial: number;
  name: string;
  designation: string;
  subject: string;
  isSenior: boolean;
  isLeadership?: boolean;
  phone?: string;
  email?: string;
  photoUrl?: string;
  teacherCode: string;
}

export interface PublicStaffDirectoryItem {
  id: string;
  serial: number;
  name: string;
  designation: string;
  indexNo: string;
  phone: string;
}

export interface FacilityCardItem {
  id: string;
  number: string;
  title: string;
  description: string;
  highlight: string;
}

export interface LiveExamSummaryStats {
  className: string;
  bengaliClassLabel: string;
  termId: string;
  termName: string;
  sessionYear: string;
  totalStudents: number;
  examinedCount: number;
  absentCount: number;
  participationRate: number;
}

export const SCHOOL_BRAND_INFO = {
  titleBn: 'আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়',
  titleEn: 'Abutorab High School',
  subtitleBn: 'আবুতোরাব, মীরসরাই, চট্টগ্রাম · EIIN: 104600 · MPO: 207121301 · স্থাপিতঃ ১৯১৪ ইং',
  locationBn: 'আবুতোরাব, মীরসরাই, চট্টগ্রাম',
  eiin: '104600',
  mpoCode: '207121301',
  establishedYearBn: '১৯১৪ ইং',
  heritageBadgeBn: 'স্থাপিতঃ ১৯১৪ ইং · ১১২ বছরের ঐতিহ্য',
  heroHeadingBn: 'আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়-এ স্বাগতম',
  heroSubtitleBn:
    'শিক্ষা, চরিত্র ও সম্ভাবনার সমন্বয়ে উজ্জ্বল ভবিষ্যত গড়ার যাত্রায় আমরা আছি পাশাপাশি।',
  logoUrl:
    'https://res.cloudinary.com/dkuy3ttqe/image/upload/v1794232821/marksheet_cards/abutorabhighschool/watermark_1794232820533.jpg',
  fallbackLogoUrl: '/assets/aistudio/school_logo_large_f25747b9.png',
  boardResultUrl: 'https://eboardresults.com/',
  officialEmail: 'athighschool1914@gmail.com',
  officialPhone: '01817264285',
};

export const MOTIVATIONAL_TICKER_ITEMS: string[] = [
  '✦ Be Positive',
  '✧ Master One Thing',
  '✦ Stay Focused',
  '✧ Seek Knowledge',
  '✦ জ্ঞানই শক্তি · স্থাপিত ১৯১৪ ইং',
  '✧ সুশৃঙ্খল জীবন ও নৈতিক শিক্ষার অঙ্গীকার',
];

export const HERO_CAROUSEL_SLIDES: HeroSlideItem[] = [
  {
    id: 'slide-1',
    imageUrl:
      'https://res.cloudinary.com/dkuy3ttqe/image/upload/v1793930639/tenant-landing/abutorabhighschool/Screenshot_76.jpg.jpg',
    caption: 'আবুতোরাব বহুমুখী উচ্চ বিদ্যালয় ক্যাম্পাস প্রাঙ্গণ',
    subCaption: 'শতবর্ষী ঐতিহ্য ও আধুনিক শিক্ষার সমন্বয় · স্থাপিত ১৯১৪ ইং',
  },
  {
    id: 'slide-2',
    imageUrl:
      'https://res.cloudinary.com/dkuy3ttqe/image/upload/v1793930418/tenant-landing/abutorabhighschool/Screenshot_75.jpg.jpg',
    caption: 'একাডেমিক ভবন ও সবুজ খেলার মাঠ',
    subCaption: 'শিক্ষার্থীদের শারীরিক ও মানসিক বিকাশে মনোরম পরিবেশ',
  },
  {
    id: 'slide-3',
    imageUrl:
      'https://res.cloudinary.com/dkuy3ttqe/image/upload/v1793930423/tenant-landing/abutorabhighschool/Screenshot_74.jpg.jpg',
    caption: 'শৃঙ্খলা ও নৈতিকতায় নিবেদিত প্রাত্যহিক সমাবেশ',
    subCaption: '৬ষ্ঠ থেকে ১০ম শ্রেণি পর্যন্ত সুশৃঙ্খল পাঠদান কার্যক্রম',
  },
  {
    id: 'slide-4',
    imageUrl:
      'https://res.cloudinary.com/dkuy3ttqe/image/upload/v1793930440/tenant-landing/abutorabhighschool/344072102_1459663791528230_622467007035653472_n.jpg.jpg',
    caption: 'সহশিক্ষা কার্যক্রম ও সাংস্কৃতিক অনুষ্ঠান',
    subCaption: 'জাতীয় দিবস উদযাপন, বিতর্ক ও সৃজনশীল মেধা চর্চা',
  },
  {
    id: 'slide-5',
    imageUrl:
      'https://res.cloudinary.com/dkuy3ttqe/image/upload/v1793851163/tenant-landing/abutorabhighschool/343609863_1195878041119190_4980167126112899203_n.jpg.jpg',
    caption: 'অভিজ্ঞ শিক্ষকমণ্ডলীর নিবিড় তত্ত্বাবধান',
    subCaption: 'বিজ্ঞান, মানবিক ও ব্যবসায় শিক্ষা বিভাগে আধুনিক পাঠদান',
  },
  {
    id: 'slide-6',
    imageUrl:
      'https://res.cloudinary.com/dkuy3ttqe/image/upload/v1793851168/tenant-landing/abutorabhighschool/354060821_766792658476705_2309232201152067442_n.jpg.jpg',
    caption: 'গৌরবময় ১১২ বছরের অগ্রযাত্রা',
    subCaption: 'মীরসরাই, চট্টগ্রামের অন্যতম ঐতিহ্যবাহী বিদ্যাপীঠ',
  },
];

export const LEADERSHIP_PROFILES: LeadershipProfile[] = [
  {
    id: 'leader-president',
    name: 'জনাব শাহাদাত হোসেন',
    roleTitle: 'সভাপতি',
    qualification: 'বিদ্যালয় পরিচালনা পর্ষদ',
    badgeColor: 'amber',
    shortQuote:
      'শতবর্ষের ঐতিহ্যবাহী আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়কে আধুনিক, প্রযুক্তিনির্ভর ও মানবিক মূল্যবোধসম্পন্ন আদর্শ শিক্ষাপ্রতিষ্ঠান হিসেবে এগিয়ে নিতে আমরা বদ্ধপরিকর।',
    fullMessage: [
      '১৯১৪ সালে প্রতিষ্ঠিত আবুতোরাব বহুমুখী উচ্চ বিদ্যালয় মীরসরাই উপজেলার শিক্ষা ও সংস্কৃতির বিকাশে এক গৌরবোজ্জ্বল বাতিঘর হিসেবে কাজ করে যাচ্ছে। দীর্ঘ ১১২ বছরের এই পথচলায় অসংখ্য কৃতি শিক্ষার্থী দেশ ও বিদেশের গুরুত্বপূর্ণ অবস্থানে থেকে সমাজের সেবা করছেন।',
      'বর্তমান বিশ্বায়নের যুগে আমাদের শিক্ষার্থীদের কেবল পাঠ্যপুস্তকের জ্ঞানে সীমাবদ্ধ রাখলে চলবে না; তাদের হতে হবে তথ্যপ্রযুক্তিতে দক্ষ, নৈতিকতায় অটল এবং দেশপ্রেমে উদ্বুদ্ধ। ডিজিটাল হাজিরা, অনলাইন ফলাফল ও আধুনিক মাল্টিমিডিয়া ক্লাসরুমের মাধ্যমে আমরা শিক্ষার মানোন্নয়নে নিরলস কাজ করছি।',
      'শিক্ষক, অভিভাবক, প্রাক্তন শিক্ষার্থী ও এলাকাবাসীর সম্মিলিত সহযোগিতায় আমাদের প্রিয় বিদ্যাপীঠটি আরও বহুদূর এগিয়ে যাবে—এই আমার দৃঢ় বিশ্বাস।',
    ],
  },
  {
    id: 'leader-headmaster',
    name: 'জনাব মর্জিনা আক্তার',
    roleTitle: 'প্রধান শিক্ষক',
    qualification: 'এম.এস.এস, এম.এড',
    photoUrl:
      'https://res.cloudinary.com/dkuy3ttqe/image/upload/v1793943526/Teachers/abutorabhighschool/%E0%A6%9C%E0%A6%A8%E0%A6%BE%E0%A6%AC_%E0%A6%AE%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A6%BF%E0%A6%A8%E0%A6%BE_%E0%A6%86%E0%A6%95%E0%A7%8D%E0%A6%A4%E0%A6%BE%E0%A6%B0_1793943525361.webp',
    badgeColor: 'teal',
    shortQuote:
      'প্রতিটি শিক্ষার্থীর সুপ্ত মেধা বিকাশ, নিয়মিত উপস্থিতি নিশ্চিতকরণ এবং শতভাগ স্বচ্ছ একাডেমিক মূল্যায়নই আমাদের প্রধান লক্ষ্য।',
    fullMessage: [
      'আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়-এর অফিসিয়াল ওয়েব পোর্টালে সবাইকে আন্তরিক স্বাগত জানাই। প্রধান শিক্ষক হিসেবে আমার প্রধান অঙ্গীকার হলো বিদ্যালয়ের প্রতিটি শ্রেণিকক্ষে আনন্দময়, শৃঙ্খলাপূর্ণ ও ফলপ্রসূ পাঠদান নিশ্চিত করা।',
      'আমাদের ১৫ জন অভিজ্ঞ ও নিবেদিতপ্রাণ শিক্ষক এবং ৭ জন কর্মঠ স্টাফ প্রতিদিন শিক্ষার্থীদের একাডেমিক অগ্রগতির পাশাপাশি তাদের চারিত্রিক ও মানবিক গুণাবলি বিকাশে নিবিড়ভাবে কাজ করছেন। এনসিটিবি (NCTB) কারিকুলাম অনুযায়ী নির্ভুল ফলাফল প্রস্তুত, ডিজিটাল মার্কশিট ও রিয়েল-টাইম উপস্থিতি পর্যবেক্ষণের মাধ্যমে অভিভাবকদের সাথে বিদ্যালয়ের সেতুবন্ধন আরও সুদৃঢ় হয়েছে।',
      'আসুন, আমরা সবাই মিলে আমাদের সন্তানদের সুশিক্ষিত ও আলোকিত মানুষ হিসেবে গড়ে তুলি।',
    ],
  },
  {
    id: 'leader-asst-headmaster',
    name: 'বাবু রতন কুমার দাশ',
    roleTitle: 'সহকারী প্রধান শিক্ষক',
    qualification: 'একাডেমিক ও পরীক্ষা সমন্বয়ক',
    badgeColor: 'emerald',
    shortQuote:
      'সুশৃঙ্খল ক্লাস রুটিন, ধারাবাহিক মূল্যায়ন এবং সহশিক্ষা কার্যক্রমের সমন্বয়ে আমরা শিক্ষার্থীদের ভবিষ্যৎ সাফল্যের ভিত্তি তৈরি করি।',
    fullMessage: [
      'শিক্ষার্থীদের নিয়মিত ক্লাসে উপস্থিতি এবং সময়ানুবর্তিতা তাদের একাডেমিক সাফল্যের মূল চাবিকাঠি। আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়ে আমরা প্রতিটি পিরিয়ডের পাঠদান ও পরীক্ষা কার্যক্রম অত্যন্ত নিষ্ঠার সাথে পরিচালনা করে থাকি।',
      '৬ষ্ঠ থেকে ১০ম শ্রেণি পর্যন্ত প্রতিটি শাখায় শ্রেণি শিক্ষকদের নিবিড় তত্ত্বাবধানে শিক্ষার্থীদের দুর্বলতা চিহ্নিত করে বিশেষ যত্ন নেওয়া হয়। বিজ্ঞান, মানবিক ও ব্যবসায় শিক্ষা বিভাগের শিক্ষার্থীরা যেন বোর্ড পরীক্ষায় কৃতিত্বপূর্ণ ফলাফল অর্জন করতে পারে সে লক্ষ্যে আমাদের প্রচেষ্টা অব্যাহত রয়েছে।',
      'সকল শিক্ষার্থীকে নিয়মিত অধ্যয়ন ও বিদ্যালয়ের নিয়ম-শৃঙ্খলা মেনে চলার আহ্বান জানাচ্ছি।',
    ],
  },
];

export const PUBLIC_TEACHERS_DIRECTORY: PublicTeacherDirectoryItem[] = [
  {
    id: 'tch-1',
    serial: 1,
    name: 'জনাব মর্জিনা আক্তার',
    designation: 'প্রধান শিক্ষক (এম.এস.এস, এম.এড)',
    subject: 'প্রশাসন ও একাডেমিক প্রধান',
    isSenior: true,
    isLeadership: true,
    phone: '01817264285',
    email: 'athighschool1914@gmail.com',
    photoUrl:
      'https://res.cloudinary.com/dkuy3ttqe/image/upload/v1793943526/Teachers/abutorabhighschool/%E0%A6%9C%E0%A6%A8%E0%A6%BE%E0%A6%AC_%E0%A6%AE%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A6%BF%E0%A6%A8%E0%A6%BE_%E0%A6%86%E0%A6%95%E0%A7%8D%E0%A6%A4%E0%A6%BE%E0%A6%B0_1793943525361.webp',
    teacherCode: 'HM',
  },
  {
    id: 'tch-2',
    serial: 2,
    name: 'বাবু রতন কুমার দাশ',
    designation: 'সহকারী প্রধান শিক্ষক',
    subject: 'একাডেমিক তত্ত্বাবধান ও গণিত',
    isSenior: true,
    isLeadership: true,
    teacherCode: 'R.D.',
  },
  {
    id: 'tch-3',
    serial: 3,
    name: 'মোহাম্মদ মোহরম আলী',
    designation: 'সিনিয়র শিক্ষক',
    subject: 'গণিত',
    isSenior: true,
    phone: '01826358038',
    email: 'ali@automatapro.com',
    teacherCode: 'M.A.',
  },
  {
    id: 'tch-4',
    serial: 4,
    name: 'মোহাম্মদ সাইফুল ইসলাম',
    designation: 'সিনিয়র শিক্ষক',
    subject: 'শরীরচর্চা ও স্বাস্থ্যবিজ্ঞান',
    isSenior: true,
    phone: '01816486592',
    email: 'saiful@automatapro.com',
    teacherCode: 'S.I.',
  },
  {
    id: 'tch-5',
    serial: 5,
    name: 'বাবু সমীরণ বড়ুয়া',
    designation: 'সিনিয়র শিক্ষক',
    subject: 'বৌদ্ধ ধর্ম',
    isSenior: true,
    teacherCode: 'S.B.',
  },
  {
    id: 'tch-6',
    serial: 6,
    name: 'মো: আবু বকর ছিদ্দিক',
    designation: 'সিনিয়র শিক্ষক',
    subject: 'ব্যবসায় শিক্ষা',
    isSenior: true,
    phone: '01817798809',
    email: 'abubokar@automatapro.com',
    teacherCode: 'A.B.S',
  },
  {
    id: 'tch-7',
    serial: 7,
    name: 'বাবু মিহির চক্রবর্তী',
    designation: 'সিনিয়র শিক্ষক',
    subject: 'হিন্দু ধর্ম ও নৈতিক শিক্ষা',
    isSenior: true,
    phone: '01719557191',
    email: 'mahir@automatapro.com',
    teacherCode: 'M.C.',
  },
  {
    id: 'tch-8',
    serial: 8,
    name: 'মর্ত্তুজা',
    designation: 'সহকারী শিক্ষক',
    subject: 'বাংলা',
    isSenior: false,
    phone: '01740982069',
    email: 'mortuja86@gmail.com',
    photoUrl:
      'https://res.cloudinary.com/dkuy3ttqe/image/upload/v1793943802/Teachers/abutorabhighschool/%E0%A6%AE%E0%A6%B0%E0%A7%8D%E0%A6%A4%E0%A7%8D%E0%A6%A4%E0%A7%81%E0%A6%9C%E0%A6%BE_1793943801613.jpg',
    teacherCode: 'G.M.',
  },
  {
    id: 'tch-9',
    serial: 9,
    name: 'অনন্য দেবনাথ',
    designation: 'সহকারী শিক্ষক',
    subject: 'ভৌত বিজ্ঞান / পদার্থবিজ্ঞান',
    isSenior: false,
    phone: '01834794241',
    email: 'ananneyadebnath@gmail.com',
    teacherCode: 'A.D.',
  },
  {
    id: 'tch-10',
    serial: 10,
    name: 'নিলুফা ইয়াছমিন',
    designation: 'সহকারী শিক্ষক',
    subject: 'কৃষি / বাংলাদেশ ও বিশ্বপরিচয়',
    isSenior: false,
    phone: '01876093186',
    email: 'nurulkarimctg0@gmail.com',
    photoUrl:
      'https://res.cloudinary.com/dkuy3ttqe/image/upload/v1794229735/Teachers/abutorabhighschool/%E0%A6%A8%E0%A6%BF%E0%A6%B2%E0%A7%81%E0%A6%AB%E0%A6%BE_%E0%A6%87%E0%A7%9F%E0%A6%BE%E0%A6%9B%E0%A6%AE%E0%A6%BF%E0%A6%A8_1794229734894.webp',
    teacherCode: 'N.I.',
  },
  {
    id: 'tch-11',
    serial: 11,
    name: 'ফরিদা আক্তার',
    designation: 'সহকারী শিক্ষক',
    subject: 'ইংরেজী',
    isSenior: false,
    phone: '01991952986',
    email: 'farida@automatapro.com',
    teacherCode: 'F.A.',
  },
  {
    id: 'tch-12',
    serial: 12,
    name: 'ফাহাদ হোসেন',
    designation: 'সহকারী শিক্ষক',
    subject: 'জীববিজ্ঞান',
    isSenior: false,
    phone: '01859129480',
    email: 'jmfahadhosan3333@gmail.com',
    teacherCode: 'F.H.',
  },
  {
    id: 'tch-13',
    serial: 13,
    name: 'মুহাম্মদ নুরুজ্জামান',
    designation: 'সহকারী শিক্ষক',
    subject: 'গ্রন্থাগার ও তথ্য বিজ্ঞান',
    isSenior: false,
    phone: '01814483335',
    email: 'nuruzzaman@automatapro.com',
    teacherCode: 'N.Z.',
  },
  {
    id: 'tch-14',
    serial: 14,
    name: 'মোঃ জাহেদুল হক চৌধুরী',
    designation: 'সহকারী শিক্ষক',
    subject: 'ইসলাম ও নৈতিক শিক্ষা',
    isSenior: false,
    phone: '01813686090',
    email: 'zahidulhoquechy@gmail.com',
    teacherCode: 'J.H.',
  },
  {
    id: 'tch-15',
    serial: 15,
    name: 'হুমায়রা পারভীন',
    designation: 'সহকারী শিক্ষক',
    subject: 'সামাজিক বিজ্ঞান',
    isSenior: false,
    teacherCode: 'H.P.',
  },
];

export const PUBLIC_STAFF_DIRECTORY: PublicStaffDirectoryItem[] = [
  {
    id: 'stf-1',
    serial: 1,
    name: 'মোহাম্মদ সাহাদাত হোসাইন',
    designation: 'কম্পিউটার ল্যাব অপারেটর',
    indexNo: 'N56829056',
    phone: '01818589033',
  },
  {
    id: 'stf-2',
    serial: 2,
    name: 'মো: নুরের ছাপা',
    designation: 'তৃতীয় শ্রেণীর কর্মচারী',
    indexNo: 'C628298',
    phone: '01812094099',
  },
  {
    id: 'stf-3',
    serial: 3,
    name: 'শিপন চন্দ্র দাশ',
    designation: 'পরিচ্ছন্নতাকর্মী',
    indexNo: 'N56832809',
    phone: '01810654699',
  },
  {
    id: 'stf-4',
    serial: 4,
    name: 'মো দিদারুল আলম',
    designation: 'নিরাপত্তাকর্মী',
    indexNo: 'N56843963',
    phone: '01830030930',
  },
  {
    id: 'stf-5',
    serial: 5,
    name: 'মোঃ শাহাদাত হোসেন',
    designation: 'নৈশ প্রহরী',
    indexNo: 'N56829055',
    phone: '01877957883',
  },
  {
    id: 'stf-6',
    serial: 6,
    name: 'মেহেদী হাসান',
    designation: 'চতুর্থ শ্রেণীর কর্মচারী',
    indexNo: 'N1155303',
    phone: '01862415718',
  },
  {
    id: 'stf-7',
    serial: 7,
    name: 'চুমকী রানী দেবী',
    designation: 'আয়া',
    indexNo: 'N56832808',
    phone: '01864756141',
  },
];

export const SEED_NOTICES: NoticeRecord[] = [
  {
    id: 'notice_2026_half_yearly',
    title: '২০২৬ শিক্ষাবর্ষের অর্ধবার্ষিক পরীক্ষার সময়সূচি ও প্রবেশপত্র বিতরণ সংক্রান্ত বিজ্ঞপ্তি',
    date: '১৫ মে, ২০২৬',
    category: 'পরীক্ষা ও মূল্যায়ন',
    isImportant: true,
    summary:
      'আগামী ০১ জুন ২০২৬ থেকে ৬ষ্ঠ হতে ১০ম শ্রেণির অর্ধবার্ষিক পরীক্ষা শুরু হবে। সকল শিক্ষার্থীকে বকেয়া পরিশোধপূর্বক প্রবেশপত্র সংগ্রহের নির্দেশ দেওয়া হলো।',
    content:
      'আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়ের ৬ষ্ঠ থেকে ১০ম শ্রেণির সকল শিক্ষার্থী ও সম্মানিত অভিভাবকদের অবগতির জন্য জানানো যাচ্ছে যে, ২০২৬ শিক্ষাবর্ষের অর্ধবার্ষিক পরীক্ষা আগামী ০১ জুন ২০২৬ তারিখ হতে নির্ধারিত রুটিন অনুযায়ী অনুষ্ঠিত হবে।\n\n১। প্রতিটি পরীক্ষার্থীকে পরীক্ষা শুরুর অন্তত ২০ মিনিট পূর্বে নির্ধারিত কক্ষে উপস্থিত থাকতে হবে।\n২। শ্রেণি শিক্ষকদের নিকট থেকে আগামী ২৫ মে ২০২৬ তারিখের মধ্যে প্রবেশপত্র সংগ্রহ করতে হবে।\n৩। পরীক্ষা চলাকালীন বিদ্যালয়ের নির্ধারিত ইউনিফর্ম ও আইডি কার্ড পরিধান করা আবশ্যক।',
    publishedBy: 'জনাব মর্জিনা আক্তার (প্রধান শিক্ষক)',
    updatedAt: '2026-05-15T09:00:00.000Z',
  },
  {
    id: 'notice_2026_digital_attendance',
    title: 'ডিজিটাল হাজিরা ও অনলাইন একাডেমিক পোর্টাল চালু সংক্রান্ত জরুরি নোটিশ',
    date: '০৮ মে, ২০২৬',
    category: 'প্রশাসনিক বিজ্ঞপ্তি',
    isImportant: true,
    summary:
      'বিদ্যালয়ের সকল শ্রেণির দৈনিক উপস্থিতি ও পরীক্ষার নম্বর এখন ক্লাউড পোর্টালে সংরক্ষিত হচ্ছে। ৭৫% এর কম উপস্থিতি থাকলে পরীক্ষায় অংশগ্রহণে বিশেষ অনুমোদন প্রয়োজন হবে।',
    content:
      'আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়ের একাডেমিক কার্যক্রমকে আরও গতিশীল ও স্বচ্ছ করার লক্ষ্যে পূর্ণাঙ্গ ডিজিটাল একাডেমিক পোর্টাল চালু করা হয়েছে।\n\n• প্রতিটি শ্রেণির শ্রেণি শিক্ষক প্রতিদিন প্রথম পিরিয়ডে অনলাইনে হাজিরা সম্পন্ন করবেন।\n• অনুপস্থিত শিক্ষার্থীদের অভিভাবকদের নিয়মিত অবহিত করা হবে।\n• যে সকল শিক্ষার্থীর মাসিক উপস্থিতি ৭৫% এর নিচে থাকবে, তাদের অভিভাবকদের শ্রেণি শিক্ষকের সাথে যোগাযোগ করার জন্য অনুরোধ করা হলো।',
    publishedBy: 'অনন্য দেবনাথ (সিস্টেম অ্যাডমিন ও সহকারী শিক্ষক)',
    updatedAt: '2026-05-08T10:30:00.000Z',
  },
  {
    id: 'notice_2026_ssc_prep',
    title: '১০ম শ্রেণির শিক্ষার্থীদের বিশেষ প্রস্তুতিমূলক ক্লাস ও মডেল টেস্ট সংক্রান্ত বিজ্ঞপ্তি',
    date: '০২ মে, ২০২৬',
    category: 'একাডেমিক',
    isImportant: false,
    summary:
      'আসন্ন এসএসসি পরীক্ষার প্রস্তুতির লক্ষ্যে ১০ম শ্রেণির বিজ্ঞান, মানবিক ও ব্যবসায় শিক্ষা বিভাগের বিশেষ ক্লাস রুটিন প্রকাশ করা হয়েছে।',
    content:
      '১০ম শ্রেণির সকল শিক্ষার্থীর অবগতির জন্য জানানো যাচ্ছে যে, বোর্ড পরীক্ষার ফলাফল আরও উন্নত করার লক্ষ্যে গণিত, ইংরেজি, পদার্থবিজ্ঞান, রসায়ন ও হিসাববিজ্ঞান বিষয়ে বিশেষ রিভিশন ক্লাস ও সাপ্তাহিক মূল্যায়ন পরীক্ষা গ্রহণ করা হবে। সকল শিক্ষার্থীকে শতভাগ উপস্থিত থাকার জন্য নির্দেশ দেওয়া যাচ্ছে।',
    publishedBy: 'বাবু রতন কুমার দাশ (সহকারী প্রধান শিক্ষক)',
    updatedAt: '2026-05-02T11:00:00.000Z',
  },
  {
    id: 'notice_2026_science_fair',
    title: 'বার্ষিক বিজ্ঞান মেলা, বিতর্ক প্রতিযোগিতা ও সাংস্কৃতিক সপ্তাহ ২০২৬',
    date: '২৪ এপ্রিল, ২০২৬',
    category: 'সহশিক্ষা কার্যক্রম',
    isImportant: false,
    summary:
      'আগামী মাসে বিদ্যালয় প্রাঙ্গণে আন্তঃশ্রেণি বিজ্ঞান প্রজেক্ট প্রদর্শনী ও বিতর্ক প্রতিযোগিতা অনুষ্ঠিত হবে। আগ্রহী শিক্ষার্থীদের নাম নিবন্ধনের আহ্বান।',
    content:
      'শিক্ষার্থীদের সৃজনশীল মেধা বিকাশের লক্ষ্যে আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়ে বার্ষিক বিজ্ঞান মেলা ও সাংস্কৃতিক সপ্তাহ আয়োজন করা হচ্ছে। ৬ষ্ঠ থেকে ১০ম শ্রেণির শিক্ষার্থীরা একক বা দলগতভাবে বিজ্ঞান প্রজেক্ট, দেয়ালিকা প্রকাশ ও বিতর্ক প্রতিযোগিতায় অংশগ্রহণ করতে পারবে।',
    publishedBy: 'জনাব মর্জিনা আক্তার (প্রধান শিক্ষক)',
    updatedAt: '2026-04-24T08:45:00.000Z',
  },
];

export const SCHOOL_FACILITIES: FacilityCardItem[] = [
  {
    id: 'fac-1',
    number: '০১',
    title: 'উন্নত পাঠদান',
    description:
      'জাতীয় শিক্ষাক্রম (NCTB) অনুসরণে সৃজনশীল পদ্ধতিতে পাঠদান, নিয়মিত ক্লাস টেস্ট এবং দুর্বল শিক্ষার্থীদের জন্য বিশেষ রিমেডিয়াল ক্লাসের ব্যবস্থা।',
    highlight: '৬ষ্ঠ–১০ম শ্রেণি · বিজ্ঞান, মানবিক ও ব্যবসায় শিক্ষা',
  },
  {
    id: 'fac-2',
    number: '০২',
    title: 'অভিজ্ঞ শিক্ষক',
    description:
      'প্রশিক্ষণপ্রাপ্ত, অভিজ্ঞ ও নিবেদিতপ্রাণ ১৫ জন শিক্ষকবৃন্দের নিবিড় তত্ত্বাবধানে প্রতিটি শিক্ষার্থীর একাডেমিক ও চারিত্রিক বিকাশ নিশ্চিতকরণ।',
    highlight: '১৫ জন শিক্ষক · বিষয়ভিত্তিক বিশেষজ্ঞ মেন্টরশিপ',
  },
  {
    id: 'fac-3',
    number: '০৩',
    title: 'ডিজিটাল ক্লাসরুম',
    description:
      'শেখ রাসেল ডিজিটাল কম্পিউটার ল্যাব, মাল্টিমিডিয়া প্রজেক্টর এবং ক্লাউড-ভিত্তিক উপস্থিতি ও স্বয়ংক্রিয় রেজাল্ট প্রসেসিং সিস্টেম।',
    highlight: 'কম্পিউটার ল্যাব · অনলাইন ফলাফল ও ডিজিটাল হাজিরা',
  },
  {
    id: 'fac-4',
    number: '০৪',
    title: 'নিরাপদ পরিবেশ',
    description:
      'সুশৃঙ্খল, পরিচ্ছন্ন ও সবুজ ক্যাম্পাস প্রাঙ্গণ, সার্বক্ষণিক নিরাপত্তা প্রহরী, বিশুদ্ধ পানীয় জল এবং সমৃদ্ধ গ্রন্থাগার ও খেলার মাঠ।',
    highlight: 'সার্বক্ষণিক নিরাপত্তা · সবুজ খেলার মাঠ ও গ্রন্থাগার',
  },
];

export const CLASS_FILTER_OPTIONS: {
  className: string;
  labelBn: string;
  shortBn: string;
}[] = [
  { className: 'ALL', labelBn: 'সকল শ্রেণি (৬ষ্ঠ–১০ম)', shortBn: 'সকল' },
  { className: 'Class 6', labelBn: '৬ষ্ঠ শ্রেণি', shortBn: '৬ষ্ঠ' },
  { className: 'Class 7', labelBn: '৭ম শ্রেণি', shortBn: '৭ম' },
  { className: 'Class 8', labelBn: '৮ম শ্রেণি', shortBn: '৮ম' },
  { className: 'Class 9', labelBn: '৯ম শ্রেণি', shortBn: '৯ম' },
  { className: 'Class 10', labelBn: '১০ম শ্রেণি', shortBn: '১০ম' },
];

export function buildWhatsAppUrl(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.startsWith('88') ? digits : `88${digits}`;
  return `https://wa.me/${normalized}`;
}

export function formatBengaliLiveDate(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('bn-BD', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return '২০২৬ শিক্ষাবর্ষ · আবুতোরাব বহুমুখী উচ্চ বিদ্যালয়';
  }
}

export function computeLiveExamSummaryForClassAndTerm(params: {
  students: Student[];
  subjectMarks: SubjectMarkRecord[];
  classNameFilter: string; // 'ALL' or 'Class 6' .. 'Class 10'
  termId: string;
  termName: string;
  sessionYear?: string;
}): LiveExamSummaryStats {
  const {
    students,
    subjectMarks,
    classNameFilter,
    termId,
    termName,
    sessionYear = '২০২৬',
  } = params;

  const activeStudents = students.filter(
    (s) =>
      s.status === 'active' &&
      (classNameFilter === 'ALL' || s.className === classNameFilter)
  );

  const studentIdsInScope = new Set(activeStudents.map((s) => s.id));
  const examinedStudentIds = new Set<string>();

  for (const mark of subjectMarks) {
    if (mark.termId === termId && studentIdsInScope.has(mark.studentId) && mark.totalMarks > 0) {
      examinedStudentIds.add(mark.studentId);
    }
  }

  const totalStudents = activeStudents.length;
  const examinedCount = examinedStudentIds.size;
  const absentCount = Math.max(0, totalStudents - examinedCount);
  const participationRate =
    totalStudents > 0 ? Math.round((examinedCount / totalStudents) * 100) : 0;

  const matchedOption = CLASS_FILTER_OPTIONS.find((c) => c.className === classNameFilter);

  return {
    className: classNameFilter,
    bengaliClassLabel: matchedOption ? matchedOption.labelBn : classNameFilter,
    termId,
    termName,
    sessionYear,
    totalStudents,
    examinedCount,
    absentCount,
    participationRate,
  };
}
