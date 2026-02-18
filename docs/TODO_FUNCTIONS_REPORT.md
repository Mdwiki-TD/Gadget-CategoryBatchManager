# تقرير عن الوظائف غير المستخدمة (TODO: use it in the workflow)

**التاريخ:** 11 فبراير 2026
**النسخة:** 1.1.1

---

## ملخص تنفيذي

وجدنا **9 وظائف** موسومة بـ `TODO: use it in the workflow` لم يتم استخدامها في سير العمل الحالي. بعض هذه الوظائف يمكن أن تحسن الأداء بشكل كبير، بينما البعض الآخر يمكن حذفه أو دمجه.

---

## الوظائف الموصى باستخدامها (أولوية عالية)

### 1. `updateCategoriesOptimized()` ⭐⭐⭐
**الموقع:** `src/services/CategoryService.js` (السطور 110-153)

**الوصف:** وظيفة محسّنة لتحديث التصنيفات باستخدام `mw.Api.edit()` بدلاً من الطريقة التقليدية.

**المميزات:**
- معالجة أفضل لتعارضات التعديل (edit conflicts)
- تستخدم `mw.Api.edit()` مع دالة تحويل (transform function)
- تضمن قراءة أحدث نسخة من الصفحة قبل التعديل
- منع الخسارة في التعديلات المتزامنة

**الحالة الحالية:**
- ✅ مختبرة بالكامل (10 اختبارات)
- ✅ تغطية 100%
- ❌ غير مستخدمة في سير العمل

**التوصية:** **استبدل `updateCategories()` بـ `updateCategoriesOptimized()`**

**التغيير المطلوب:**
```javascript
// في BatchProcessor.js (السطر 74)
// الحالي:
const result = await this.categoryService.updateCategories(
    file.title,
    categoriesToAdd,
    categoriesToRemove
);

// الموصى به:
const result = await this.categoryService.updateCategoriesOptimized(
    file.title,
    categoriesToAdd,
    categoriesToRemove
);
```

**الفائدة:** تحسين كبير في موثوقية التعديلات المتزامنة وتقليل تضارب التعديلات.

---

### 2. `isValidCategoryName()` ⭐⭐
**الموقع:** `src/utils/Validator.js` (السطور 12-20)

**الوصف:** تتحقق من صحة اسم التصنيف.

**المميزات:**
- تتحقق من عدم وجود أحرف غير صالحة
- تمنع حقن الكود
- تتحقق من طول الاسم

**الحالة الحالية:**
- ✅ مختبرة
- ❌ غير مستخدمة

**التوصية:** **إضافتها للتحقق من مدخلات المستخدم**

**مكان الاستخدام المقترح:**
- في `CategoryInputsHandler.js` - عند إضافة/حذف تصنيفات
- في `ChangesHandler.js` - عند التحقق من صحة التصنيفات قبل المعالجة

---

## الوظائف التي يمكن دمجها

### 3. `buildEditSummary()` ⭐
**الموقع:** `src/services/CategoryService.js` (السطور 176-181)

**الوصف:** تبني ملخص التعديل من قوائم الإضافة/الحذف.

**الحالة الحالية:**
- ✅ مختبرة
- ❌ غير مستخدمة (لكن المنطق موجود داخل `updateCategoriesOptimized()`)

**التوصية:** **دمجها في `updateCategoriesOptimized()` فقط**

**السبب:** المنطق موجود بالفعل داخل `updateCategoriesOptimized()` (السطور 135-141). الوظيفة المستقلة غير ضرورية.

---

## الوظائف الموصى بحذفها

### 4. `addCategoriesToFile()`
**الموقع:** `src/services/CategoryService.js` (السطور 24-43)

**الوصف:** تضيف تصنيفات فقط (بدون حذف).

**لماذا الحذف؟**
- الوظيفة الحالية `updateCategoriesOptimized()` تتعامل مع الإضافة والحذف معاً
- لا توجد حاجة لوظيفة إضافة فقط
- تقليل تعقيد الكود

---

### 5. `removeCategoriesFromFile()`
**الموقع:** `src/services/CategoryService.js` (السطور 52-69)

**الوصف:** تحذف تصنيفات فقط.

**لماذا الحذف؟**
- نفس سبب `addCategoriesToFile()`
- الوظيفة الشاملة `updateCategoriesOptimized()` تغني عنها

---

### 6. `getCurrentCategories()`
**الموقع:** `src/services/CategoryService.js` (السطور 161-167)

**الوصف:** تجلب التصنيفات الحالية لملف.

**لماذا الحذف؟**
- وظيفة غلاف بسيطة (`wrapper`) لـ `api.getCategories()`
- لا تضيف قيمة حقيقية
- يمكن استخدام `api.getCategories()` مباشرة

**التوصية:** حذف واستخدام `APIService.getCategories()` مباشرة عند الحاجة.

---

### 8. `extractCategories()`
**الموقع:** `src/utils/WikitextParser.js` (السطور 12-22)

**الوصف:** تستخرج جميع التصنيفات من نص الويكي.

**لماذا الحذف؟**
- الاعتماد على `APIService.getCategories()` أكثر موثوقية
- تحليل الويكي صعب وعرضة للأخطاء
- لا توجد حاجة لاستخراج التصنيفات من النص

---


## خطة العمل المقترحة

### المرحلة الأولى - استبدال الوظيفة المحسّنة (ضروري)
1. استبدال `updateCategories()` بـ `updateCategoriesOptimized()` في `BatchProcessor.js`
2. اختبار التغيير بشكل مكثف
3. مراقبة الأداء في بيئة الإنتاج

### المرحلة الثانية - إضافة التحقق من الصحة (موصى به)
1. إضافة `isValidCategoryName()` في `CategoryInputsHandler.js`
2. إضافة رسائل خطأ واضحة للمستخدم
3. اختبار الحالات الحرجة

### المرحلة الثالثة - التنظيف (اختياري)
1. حذف الوظائف غير المستخدمة
2. تحديث الاختبارات
3. تحديث التوثيق

---

## ملخص التوصيات

| الوظيفة | التوصية | الأولوية | الجهد |
|---------|---------|---------|-------|
| `updateCategoriesOptimized()` | استخدمها | عالية | منخفض |
| `isValidCategoryName()` | استخدمها | متوسطة | منخفض |
| `buildEditSummary()` | ادمجها | منخفض | منخفض |
| `addCategoriesToFile()` | احذفها | منخفض | - |
| `removeCategoriesFromFile()` | احذفها | منخفض | - |
| `getCurrentCategories()` | احذفها | منخفض | - |
| `sanitizeInput()` | احذفها | منخفض | - |
| `extractCategories()` | احذفها | منخفض | - |

---

## الخلاصة

- **وظيفتان** تستحقان الاستخدام: `updateCategoriesOptimized()` و `isValidCategoryName()`
- **سبع وظائف** يمكن حذفها لتبسيط الكود
- استخدام `updateCategoriesOptimized()` سيعطي **تحسناً كبيراً** في موثوقية التعديلات

---

**التوصية النهائية:** البدء باستخدام `updateCategoriesOptimized()` فوراً لتحسين موثوقية العملية، مع التخطيط لحذف الوظائف غير المستخدمة في الإصدار القادم.
