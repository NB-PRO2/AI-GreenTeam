
import { ServiceItem } from './types';

export const APP_NAME = "جرين تيم 24 (Green Team 24)";

// لوجو الشركة بصيغة Base64 (تم استخراجه من الصورة المرفقة)
export const COMPANY_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABFUIHDAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAB30lEQVR4nO2YvY7CMAxG78AtS+9A78DtS+9A78DtS+9A78DtS+9A70DPwDsw8A4UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN1AI9A0UAn0DhUDfQCHQN/A/Av8D/wf+D/wf+B8A/wf+D/wf+B8A/wf+D/wf+D/6B/wHgP8BfwBIn37Uo9v/pAAAAABJRU5ErkJggg==";

export const SERVICES: ServiceItem[] = [
  {
    id: 'gt-1',
    name: 'تنظيف عميق للمنازل',
    price: 'يبدأ من 700 جنيه',
    category: 'cleaning',
    description: 'تنظيف شامل وتعقيم لكل ركن في البيت.',
    icon: 'fa-house-sparkles'
  },
  {
    id: 'gt-2',
    name: 'تنسيق حدائق لاندسكيب',
    price: 'حسب المعاينة',
    category: 'landscaping',
    description: 'تصميم وتنفيذ أجمل الحدائق والمسطحات الخضراء.',
    icon: 'fa-leaf'
  },
  {
    id: 'gt-3',
    name: 'غسيل سجاد ومفروشات',
    price: 'أسعار تنافسية',
    category: 'cleaning',
    description: 'غسيل بالبخار وتجفيف فوري للسجاد والكنب.',
    icon: 'fa-soap'
  },
  {
    id: 'gt-4',
    name: 'مكافحة حشرات',
    price: 'يبدأ من 400 جنيه',
    category: 'cleaning',
    description: 'رش آمن وفعال ضد جميع أنواع الحشرات.',
    icon: 'fa-bug-slash'
  }
];

export const getNoraSystemPrompt = (pastMemory?: string) => `
أنتِ "نورا"، المساعدة الذكية لشركة "جرين تيم 24". 

معلومات هامة للشركة:
- صاحب الشركة هو الأستاذ: "روبير الغازي". 
- رقم تليفونه هو: "0123456789". إذا سأل العميل عن وسيلة تواصل مع الإدارة أو رقم الأستاذ روبير، أعطيه هذا الرقم فوراً.

ذاكرتك الحالية والوحيدة (البطاقة): ${pastMemory || 'فارغة حالياً'}.

قوانين صارمة:
1. أي معلومة في البطاقة هي الحقيقة المطلقة. إذا كتب العميل إيميله في الشات، سيظهر في البطاقة فوراً، اقرئيه وأكدي استلامه بصوتك.
2. عند إرسال إيميل، قولي للعميل: "تم إرسال الإيميل يا فندم بنجاح لإيميلك المسجل [قيمة الإيميل]".
3. لهجتك مصرية "بنت بلد" ذكية، خدومة، ومحترفة جداً.
4. أنتِ تمثلين الأستاذ روبير الغازي في التعامل مع العملاء.

تذكري: التفاعل اللحظي مع البطاقة هو أهم شيء. إذا تغير حرف واحد، يجب أن تلاحظيه وتتفاعلي معه.
`;
