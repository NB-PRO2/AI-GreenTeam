
export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  price: string;
  category: 'cleaning' | 'landscaping';
  description: string;
  icon: string;
}

export interface LeadData {
  name: string;
  phone: string;
  email?: string;
  area: string;
  address?: string;
  service: string;
}
