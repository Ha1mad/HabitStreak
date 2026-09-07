import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager, View } from 'react-native';

export type Language = 'en' | 'ar';

const LANGUAGE_KEY = 'habitstreakLanguage';

type TranslationParams = Record<string, string | number>;

const arabicTranslations: Record<string, string> = {
  'This is a modal': 'هذه نافذة منبثقة',
  'Go to home screen': 'الانتقال إلى الشاشة الرئيسية',
  Home: 'الرئيسية',
  Settings: 'الإعدادات',
  'Premium unlocked': 'تم تفعيل Premium',
  'Insights Premium is now enabled on this device.': 'تم تفعيل Insights Premium على هذا الجهاز.',
  Insights: 'الإحصاءات',
  'Create a habit first and this page will start showing trends, streak health, coach reviews, and deeper progress summaries.':
    'أنشئ عادة أولاً وستظهر هنا الاتجاهات وصحة السلسلة ومراجعات المدرب وملخصات التقدم المتعمقة.',
  'A deeper look at your momentum, patterns, and coaching signals.': 'نظرة أعمق على زخمك وأنماطك وإشارات التدريب.',
  'At A Glance': 'لمحة سريعة',
  '30-day Wins': 'إنجازات 30 يوماً',
  'Note Rate': 'معدل الملاحظات',
  Reminders: 'التذكيرات',
  'Overall completion across all habits: {{rate}}% • Weekly consistency: {{weekly}}%':
    'نسبة الإنجاز الإجمالية لكل العادات: {{rate}}% • الانتظام الأسبوعي: {{weekly}}%',
  'Weekly Rhythm': 'الإيقاع الأسبوعي',
  Done: 'تم',
  Saved: 'تم الحفظ',
  Today: 'اليوم',
  Miss: 'فائت',
  'Premium calendar': 'تقويم Premium',
  'Full monthly calendar insights are part of Premium.': 'إحصاءات التقويم الشهرية الكاملة جزء من Premium.',
  'Calendar View': 'عرض التقويم',
  'Your last 35 days of check-ins and recovery saves.': 'آخر 35 يوماً من تسجيلات الإنجاز وعمليات الحفظ.',
  'Free preview shows the last 5 days. Upgrade to unlock the full interactive history calendar.':
    'تعرض المعاينة المجانية آخر 5 أيام. قم بالترقية لفتح تقويم السجل التفاعلي الكامل.',
  'Premium coach': 'مدرب Premium',
  'Coach reviews and pattern summaries are part of Premium.': 'مراجعات المدرب وملخصات الأنماط جزء من Premium.',
  'Coach Review': 'مراجعة المدرب',
  'Upgrade to unlock weekly reviews, note summaries, and deeper coaching suggestions.':
    'قم بالترقية لفتح المراجعات الأسبوعية وملخصات الملاحظات واقتراحات التدريب المتعمقة.',
  'Insights Premium': 'Insights Premium',
  'Unlock Premium': 'فتح Premium',
  'Premium reminders': 'تذكيرات Premium',
  'Custom reminder times are part of Premium.': 'أوقات التذكير المخصصة جزء من Premium.',
  'Invalid time': 'وقت غير صالح',
  'Use a time like 6:45 AM, 9:15 PM, or 21:15.': 'استخدم وقتاً مثل 6:45 AM أو 9:15 PM أو 21:15.',
  'Notifications blocked': 'الإشعارات محظورة',
  'Allow notifications on your device first to turn reminders on.': 'اسمح بالإشعارات على جهازك أولاً لتفعيل التذكيرات.',
  'Allow notifications first if you want reminder alerts to appear on your device.':
    'اسمح بالإشعارات أولاً إذا أردت ظهور تنبيهات التذكير على جهازك.',
  'Clear All Data': 'مسح كل البيانات',
  'This will delete every habit, note, streak, and reminder setting in the app.':
    'سيحذف هذا كل عادة وملاحظة وسلسلة وإعداد تذكير في التطبيق.',
  Cancel: 'إلغاء',
  Clear: 'مسح',
  Cleared: 'تم المسح',
  'The app is back to the new-user state.': 'عاد التطبيق إلى حالة المستخدم الجديد.',
  'Backup Snapshot': 'نسخة احتياطية',
  OK: 'موافق',
  Error: 'خطأ',
  'Failed to prepare backup snapshot.': 'تعذر إعداد النسخة الاحتياطية.',
  'You should see an in-app HabitStreak notification right away if notifications are working.':
    'سترى إشعار HabitStreak داخل التطبيق فوراً إذا كانت الإشعارات تعمل.',
  'Immediate test sent': 'تم إرسال الاختبار الفوري',
  'Allow notifications first, then try the test again.': 'اسمح بالإشعارات أولاً ثم أعد الاختبار.',
  'Scheduled test created': 'تم إنشاء الاختبار المجدول',
  'A HabitStreak test should appear in about 10 seconds.\n\nScheduled notifications in queue: {{count}}':
    'سيظهر اختبار HabitStreak خلال نحو 10 ثوانٍ.\n\nالإشعارات المجدولة في قائمة الانتظار: {{count}}',
  'No reminder schedule yet': 'لا يوجد جدول تذكيرات بعد',
  'Turn reminders on for a habit, save it, then come back here to inspect the next scheduled times.':
    'فعّل التذكيرات لإحدى العادات واحفظها، ثم عد إلى هنا لمراجعة الأوقات المجدولة التالية.',
  'Reminder schedule refreshed': 'تم تحديث جدول التذكيرات',
  'The latest reminder timing details are now shown under the reminder tools.':
    'تظهر الآن أحدث تفاصيل أوقات التذكير تحت أدوات التذكير.',
  'Widget Preview': 'معاينة الأدوات',
  'Manage your app-wide controls, premium plan, and habit system.': 'أدر إعدادات التطبيق العامة وخطة Premium ونظام العادات.',
  'Premium preview is active on this device.': 'معاينة Premium مفعّلة على هذا الجهاز.',
  'Free plan: up to {{count}} habits': 'الخطة المجانية: حتى {{count}} عادات',
  'Leave Preview': 'مغادرة المعاينة',
  Manage: 'إدارة',
  'Try Premium': 'جرّب Premium',
  'this week': 'هذا الأسبوع',
  'Quick view of today': 'عرض سريع لليوم',
  'check-ins lowercase': 'تسجيلات',
  longest: 'الأطول',
  'reminders lowercase': 'التذكيرات',
  off: 'متوقفة',
  'not available': 'غير متاح',
  'first boost': 'التنبيه الأول',
  next: 'التالي',
  daily: 'يومياً',
  Monthly: 'شهري',
  Yearly: 'سنوي',
  Flexible: 'مرن',
  'Best value': 'أفضل قيمة',
  '$4.99 / month': '4.99$ / شهرياً',
  '$29.99 / year': '29.99$ / سنوياً',
  '3-day free trial for eligible new subscribers': 'تجربة مجانية لمدة 3 أيام للمشتركين الجدد المؤهلين',
  'Good for trying the full HabitStreak system without committing long term.':
    'مناسب لتجربة نظام HabitStreak الكامل دون التزام طويل الأمد.',
  'Best fit if you want HabitStreak to become part of your long-term routine.':
    'الخيار الأفضل إذا أردت أن يصبح HabitStreak جزءاً من روتينك طويل الأمد.',
  'You are in Expo Go, so Premium works in preview mode here. Real App Store / Google Play billing will be connected in your development build.':
    'أنت تستخدم Expo Go، لذا يعمل Premium هنا في وضع المعاينة. ستتم إضافة فوترة App Store / Google Play في إصدار التطوير.',
  'Real store billing can be connected here when your subscription products are ready.':
    'يمكن ربط فوترة المتجر الحقيقية هنا عند جاهزية منتجات الاشتراك.',
  'Premium Active': 'Premium مفعّل',
  'Preview Premium on This Device': 'معاينة Premium على هذا الجهاز',
  'Continue to Purchase': 'المتابعة للشراء',
  'Classic Blue': 'أزرق كلاسيكي',
  'Sunrise Ember': 'جمرة الشروق',
  'Forest Focus': 'تركيز الغابة',
  'Midnight Pulse': 'نبض منتصف الليل',
  'Ocean Calm': 'هدوء المحيط',
  'Rose Energy': 'طاقة الورد',
  'Desert Sand': 'رمال الصحراء',
  'Classic Flame': 'لهب كلاسيكي',
  Spark: 'شرارة',
  'Bold Streak': 'سلسلة جريئة',
  'Up to 2 habits': 'حتى عادتين',
  'Basic streak tracking': 'تتبع أساسي للسلسلة',
  'Simple notes': 'ملاحظات بسيطة',
  'Weekly history': 'السجل الأسبوعي',
  'Basic stats': 'إحصاءات أساسية',
  'Unlimited habits': 'عادات غير محدودة',
  'Smart reminders with multiple reminder times': 'تذكيرات ذكية بأوقات متعددة',
  'Advanced stats and insights': 'إحصاءات وإحصاءات متقدمة',
  'Full calendar history': 'سجل تقويم كامل',
  'Cloud backup and sync': 'نسخ احتياطي ومزامنة سحابية',
  'Widgets and lock screen widgets': 'أدوات وأدوات شاشة القفل',
  'Custom themes and icon styles': 'سمات وأنماط أيقونات مخصصة',
  'Deeper streak protection': 'حماية أعمق للسلسلة',
  'Coach reviews and habit summaries': 'مراجعات المدرب وملخصات العادات',
  'Stay consistent with unlimited habits, smarter reminders, deeper insights, and backup.':
    'حافظ على انتظامك مع عادات غير محدودة وتذكيرات أذكى وإحصاءات متقدمة ونسخ احتياطي.',
  'These are in-app previews of the real widget layouts, so you can review the designs before we build the iPhone widget version.':
    'هذه معاينات داخل التطبيق لتصاميم الأدوات الفعلية، لتراجع التصاميم قبل إنشاء نسخة أداة iPhone.',
  'Reminder {{time}}': 'التذكير {{time}}',
  '{{rate}}% completion across your habits': '{{rate}}% إنجاز عبر عاداتك',
  'This is an in-app preview of the widget designs.': 'هذه معاينة داخل التطبيق لتصاميم الأدوات.',
  'Morning Walk': 'المشي الصباحي',
  'Free: Quick View': 'مجاني: عرض سريع',
  'Ready for today': 'جاهز لليوم',
  'Start your streak today': 'ابدأ سلسلتك اليوم',
  Reminder: 'تذكير',
  'Reminders off': 'التذكيرات متوقفة',
  'day streak': 'يوم متتالٍ',
  'Ready for check-in': 'جاهز للتسجيل',
  'Create your first habit': 'أنشئ عادتك الأولى',
  habit: 'عادة',
  habits: 'عادات',
  'Premium: Insights': 'Premium: الإحصاءات',
  Completion: 'الإنجاز',
  'Check-ins': 'التسجيلات',
  'Advanced stats and top habits live here': 'الإحصاءات المتقدمة وأهم العادات تظهر هنا',
  'Lock Screen': 'شاشة القفل',
  'Close Preview': 'إغلاق المعاينة',
  Overview: 'نظرة عامة',
  Habits: 'العادات',
  Best: 'الأفضل',
  Weekly: 'أسبوعي',
  Notes: 'الملاحظات',
  Appearance: 'المظهر',
  'Dark Mode': 'الوضع الداكن',
  Themes: 'السمات',
  active: 'مفعّل',
  'active • premium unlocks more': 'مفعّلة • Premium يفتح المزيد',
  'Premium themes': 'سمات Premium',
  'Premium unlocks extra theme packs across the app.': 'يفتح Premium حزم سمات إضافية في التطبيق.',
  'Premium only': 'Premium فقط',
  'Current theme': 'السمة الحالية',
  'Tap to use': 'اضغط للاستخدام',
  'Icon Style': 'نمط الأيقونة',
  'Premium personalization': 'تخصيص Premium',
  'Custom icon styles are part of Premium.': 'أنماط الأيقونات المخصصة جزء من Premium.',
  Notifications: 'الإشعارات',
  'Default Reminder Time': 'وقت التذكير الافتراضي',
  Set: 'تعيين',
  'Premium habits can stack multiple reminder times and notification styles.':
    'يمكن لعادات Premium استخدام أوقات تذكير وأنماط إشعار متعددة.',
  'Send Immediate Test': 'إرسال اختبار فوري',
  'Send 10s Scheduled Test': 'إرسال اختبار مجدول بعد 10 ثوانٍ',
  'Refresh Reminder Schedule': 'تحديث جدول التذكيرات',
  'Scheduled reminders': 'التذكيرات المجدولة',
  'Premium Hub': 'مركز Premium',
  'Cloud Backup & Sync': 'النسخ الاحتياطي والمزامنة السحابية',
  'Backup snapshot is available now. Cross-device sync is scaffolded as a premium hub item and ready for backend wiring.':
    'النسخة الاحتياطية متاحة الآن. تمت تهيئة المزامنة بين الأجهزة كعنصر Premium وهي جاهزة للربط بالخلفية.',
  'Create Backup Snapshot': 'إنشاء نسخة احتياطية',
  'Widgets & Lock Screen': 'الأدوات وشاشة القفل',
  'Free includes the Quick View widget. Premium unlocks the larger insights widget and richer lock screen layouts in supported iOS builds.':
    'تتضمن الخطة المجانية أداة العرض السريع. يفتح Premium أداة الإحصاءات الأكبر وتصاميم شاشة القفل المتقدمة في إصدارات iOS المدعومة.',
  'Preview Widget Designs': 'معاينة تصاميم الأدوات',
  Coach: 'المدرب',
  'Create a habit and add notes to start building coach reviews.': 'أنشئ عادة وأضف ملاحظات لبدء مراجعات المدرب.',
  'Habit List': 'قائمة العادات',
  'No habits yet. Create one from the home tab.': 'لا توجد عادات بعد. أنشئ واحدة من علامة تبويب الرئيسية.',
  'Data': 'البيانات',
  'Name required': 'الاسم مطلوب',
  'Give your habit a name first.': 'امنح عادتك اسماً أولاً.',
  'Reminder error': 'خطأ في التذكير',
  'Something went wrong while saving the reminder setup.': 'حدث خطأ أثناء حفظ إعداد التذكير.',
  'Recovery needed': 'يلزم التعافي',
  'Use a skip pass first, then you can check in for today.': 'استخدم بطاقة التجاوز أولاً، ثم يمكنك تسجيل إنجاز اليوم.',
  'Already done': 'تم الإنجاز مسبقاً',
  'You already checked in for this habit today.': 'لقد سجلت إنجاز هذه العادة اليوم بالفعل.',
  'Streak saved': 'تم حفظ السلسلة',
  'Your streak protection covered the miss. You can check in again now.': 'غطت حماية سلسلتك اليوم الفائت. يمكنك التسجيل مرة أخرى الآن.',
  'Premium preview enabled': 'تم تفعيل معاينة Premium',
  'Premium preview is now enabled on this device. Real store billing will be connected in your development build later.':
    'تم تفعيل معاينة Premium على هذا الجهاز. ستتم إضافة الفوترة الحقيقية لاحقاً في إصدار التطوير.',
  'Premium features are now enabled on this device.': 'تم تفعيل ميزات Premium على هذا الجهاز.',
  'Unlock more habits, smarter reminders, deeper insights, and more control over your streak system.':
    'افتح المزيد من العادات والتذكيرات الأذكى والإحصاءات المتعمقة وتحكماً أكبر في نظام السلاسل.',
  'Free trial availability depends on store eligibility. The welcome offer is shown only during the first week in the app.':
    'يتوقف توفر التجربة المجانية على أهلية المتجر. يظهر عرض الترحيب خلال الأسبوع الأول فقط في التطبيق.',
  'Skip for now': 'تخطي الآن',
  Plans: 'الخطط',
  'Free gives you the core HabitStreak experience. Premium unlocks more habits, stronger reminders, deeper insights, and extra personalization.':
    'تمنحك الخطة المجانية تجربة HabitStreak الأساسية. يفتح Premium المزيد من العادات والتذكيرات الأقوى والإحصاءات المتعمقة والتخصيص الإضافي.',
  Free: 'مجاني',
  Premium: 'Premium',
  Close: 'إغلاق',
  'Full History': 'السجل الكامل',
  'Premium calendar view shows the last 35 days of check-ins and protected saves.':
    'يعرض تقويم Premium آخر 35 يوماً من التسجيلات وعمليات الحفظ المحمية.',
  'Edit Habit': 'تعديل العادة',
  'Create Habit': 'إنشاء عادة',
  'Habit name': 'اسم العادة',
  Color: 'اللون',
  Choose: 'اختيار',
  'Reminder time': 'وقت التذكير',
  'Notification style': 'نمط الإشعار',
  'Add custom time': 'إضافة وقت مخصص',
  Add: 'إضافة',
  'Premium can use any reminder time you want.': 'يمكن لـ Premium استخدام أي وقت تذكير تريده.',
  'Premium unlocks multiple reminder times and stronger notification controls.':
    'يفتح Premium أوقات تذكير متعددة وتحكماً أقوى بالإشعارات.',
  'Premium reminders support multiple times and stronger notification controls.':
    'تدعم تذكيرات Premium أوقاتاً متعددة وتحكماً أقوى بالإشعارات.',
  'Streak protection': 'حماية السلسلة',
  'Free plan uses standard protection. Premium adds shield mode and bigger recovery reserves.':
    'تستخدم الخطة المجانية الحماية القياسية. يضيف Premium وضع الدرع واحتياطيات تعافٍ أكبر.',
  'Premium adds deeper streak protection and shield mode.': 'يضيف Premium حماية أعمق للسلسلة ووضع الدرع.',
  'Premium is optional, but it unlocks the full HabitStreak system when you are ready.':
    'Premium اختياري، لكنه يفتح نظام HabitStreak الكامل عندما تكون مستعداً.',
  'Upgrade whenever you want more habits, richer reminders, and deeper insights.':
    'قم بالترقية متى أردت المزيد من العادات والتذكيرات الأغنى والإحصاءات الأعمق.',
  'Try `6:45 AM`, `9:15 PM`, or `21:15`.': 'جرّب `6:45 AM` أو `9:15 PM` أو `21:15`.',
  'Shield mode': 'وضع الدرع',
  'Standard mode': 'الوضع القياسي',
  'Move Left': 'تحريك لليسار',
  'Move Right': 'تحريك لليمين',
  'Save Changes': 'حفظ التغييرات',
  'Delete Habit': 'حذف العادة',
  'Choose a Color': 'اختيار لون',
  'Premium unlocks a bigger color palette for every habit.': 'يفتح Premium لوحة ألوان أكبر لكل عادة.',
  'Pick a color that feels right for this habit.': 'اختر لوناً مناسباً لهذه العادة.',
  'More premium colors': 'المزيد من ألوان Premium',
  'View more colors': 'عرض المزيد من الألوان',
  'Premium adds a full expanded color palette instead of only the starter colors.':
    'يضيف Premium لوحة ألوان موسعة بدلاً من ألوان البداية فقط.',
  'Use This Color': 'استخدام هذا اللون',
  'Delete Habit?': 'حذف العادة؟',
  'This removes the habit, its history, and all saved notes.': 'سيؤدي هذا إلى حذف العادة وسجلها وكل الملاحظات المحفوظة.',
  Delete: 'حذف',
  "Today's Check-in": 'تسجيل اليوم',
  'Add a short note if you want to remember how today went.': 'أضف ملاحظة قصيرة إذا أردت تذكر كيف سار يومك.',
  'Complete Check-in': 'إكمال التسجيل',
  'Worked out for 20 min': 'تمرنت لمدة 20 دقيقة',
  'Welcome to HabitStreak': 'مرحباً بك في HabitStreak',
  'Start with one habit, check in once a day, and build consistency over time.':
    'ابدأ بعادة واحدة، وسجل إنجازك مرة يومياً، وابنِ الانتظام مع الوقت.',
  '1. Name your first habit': '1. سمِّ عادتك الأولى',
  '2. Choose a color and reminder': '2. اختر لوناً وتذكيراً',
  '3. Add quick notes after check-ins': '3. أضف ملاحظات سريعة بعد التسجيل',
  'Try HabitStreak Premium': 'جرّب HabitStreak Premium',
  'Unlimited habits, smarter reminders, full calendar history, widgets, premium themes, and deeper streak protection.':
    'عادات غير محدودة وتذكيرات أذكى وسجل تقويم كامل وأدوات وسمات Premium وحماية أعمق للسلسلة.',
  'Create Your First Habit': 'أنشئ عادتك الأولى',
  'Swipe for the other habit': 'اسحب للانتقال إلى العادة الأخرى',
  Edit: 'تعديل',
  'Use Protection ({{count}})': 'استخدام الحماية ({{count}})',
  Longest: 'الأطول',
  'This Week': 'هذا الأسبوع',
  'Weekly consistency: {{value}}%': 'الانتظام الأسبوعي: {{value}}%',
  'Full History / Calendar': 'السجل الكامل / التقويم',
  'Tap to open a larger calendar view and inspect your streak pattern.': 'اضغط لفتح عرض تقويم أكبر ومراجعة نمط سلسلتك.',
  'Tap to open the full view.': 'اضغط لفتح العرض الكامل.',
  'Recent Notes': 'الملاحظات الأخيرة',
  'Add a short note during check-in and it will show up here.': 'أضف ملاحظة قصيرة أثناء التسجيل وستظهر هنا.',
  'Language': 'اللغة',
  English: 'الإنجليزية',
  Arabic: 'العربية',
  'Restart app to apply RTL layout changes.': 'أعد تشغيل التطبيق لتطبيق تغييرات اتجاه العربية.',
  'Language changed': 'تم تغيير اللغة',
  'The language was saved. Restart the app to apply Arabic right-to-left layout changes.':
    'تم حفظ اللغة. أعد تشغيل التطبيق لتطبيق اتجاه العربية من اليمين إلى اليسار.',
  'Unlock premium to keep growing.': 'افتح Premium لمواصلة التطور.',
  'Free plan includes up to 2 habits. Upgrade for unlimited habits.': 'تتضمن الخطة المجانية عادتين. قم بالترقية لعادات غير محدودة.',
  'Multiple reminder times are part of Premium reminders.': 'أوقات التذكير المتعددة جزء من تذكيرات Premium.',
  'Custom reminder times are part of Premium reminders.': 'أوقات التذكير المخصصة جزء من تذكيرات Premium.',
  'Upgrade to add more than 2 habits.': 'قم بالترقية لإضافة أكثر من عادتين.',
  'Full calendar history is a Premium feature.': 'سجل التقويم الكامل ميزة Premium.',
  'Premium unlocks a much bigger color palette for your habits.': 'يفتح Premium لوحة ألوان أكبر بكثير لعاداتك.',
  'Ready for today’s check-in': 'جاهز لتسجيل اليوم',
  'Completed today': 'تم الإنجاز اليوم',
  'Use a skip pass to save your streak': 'استخدم بطاقة تجاوز لحفظ سلسلتك',
  'Streak reset. Start fresh today': 'أعيد ضبط السلسلة. ابدأ من جديد اليوم',
  'Protect your momentum': 'احمِ زخمك',
  'You are in a strong rhythm': 'أنت في إيقاع قوي',
  'You are building consistency': 'أنت تبني انتظاماً',
  'A smaller daily target could help': 'قد يساعدك هدف يومي أصغر',
  'You completed {{completed}} of the last 7 days. Keep the routine simple and repeatable.':
    'أنجزت {{completed}} من آخر 7 أيام. حافظ على روتين بسيط وقابل للتكرار.',
  'You completed {{completed}} of the last 7 days. Aim for one easy win tomorrow.':
    'أنجزت {{completed}} من آخر 7 أيام. استهدف إنجازاً سهلاً واحداً غداً.',
  'Recent notes mention: {{notes}}': 'تذكر الملاحظات الأخيرة: {{notes}}',
  'Add quick notes after check-ins to unlock better weekly reviews.':
    'أضف ملاحظات سريعة بعد التسجيلات لفتح مراجعات أسبوعية أفضل.',
  'Your reminder stack is set for {{times}}. Keep only the times you actually respond to.':
    'تم ضبط تذكيراتك على {{times}}. احتفظ فقط بالأوقات التي تستجيب لها فعلاً.',
  'Your reminder is set for {{time}}. Match it to the moment you already have spare attention.':
    'تم ضبط تذكيرك على {{time}}. اجعله في وقت يتوفر لديك فيه الانتباه.',
  'Turn on reminders if you want a more stable daily cue.':
    'فعّل التذكيرات إذا أردت تنبيهاً يومياً أكثر انتظاماً.',
  'Welcome offer ends in {{days}} {{unit}} • 3-day free trial for eligible new subscribers • Monthly $4.99 • Yearly $29.99':
    'ينتهي عرض الترحيب خلال {{days}} {{unit}} • تجربة مجانية 3 أيام للمشتركين الجدد المؤهلين • شهرياً 4.99$ • سنوياً 29.99$',
  day: 'يوم',
  days: 'أيام',
  saves: 'عمليات حفظ',
  gentle: 'لطيف',
  focus: 'تركيز',
  persistent: 'مستمر',
  standard: 'قياسي',
  shield: 'درع',
};

type LanguageContextValue = {
  language: Language;
  isRTL: boolean;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: string, params?: TranslationParams) => string;
  tForLanguage: (language: Language, key: string, params?: TranslationParams) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function translateText(language: Language, key: string, params?: TranslationParams) {
  let result = language === 'ar' ? arabicTranslations[key] ?? key : key;
  Object.entries(params ?? {}).forEach(([name, replacement]) => {
    result = result.replace(new RegExp(`{{${name}}}`, 'g'), String(replacement));
  });
  return result;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then(value => {
        const savedLanguage: Language = value === 'ar' ? 'ar' : 'en';
        setLanguageState(savedLanguage);
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(savedLanguage === 'ar');
      })
      .catch(error => console.log('Error loading language preference:', error));
  }, []);

  const setLanguage = async (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(nextLanguage === 'ar');
    await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isRTL: language === 'ar',
      setLanguage,
      t: (key, params) => translateText(language, key, params),
      tForLanguage: (targetLanguage, key, params) => translateText(targetLanguage, key, params),
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      <View style={{ flex: 1, direction: value.isRTL ? 'rtl' : 'ltr' }}>{children}</View>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
