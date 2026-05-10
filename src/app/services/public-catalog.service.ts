import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PublicCatalogCourse {
  id: string;
  title: string;
  description: string;
  modules: number;
  students: number;
  thumbnail: string;
  access: 'free' | 'paid';
  priceEur: number;
  priceTnd?: number;
  priceUsd?: number;
  pricingCurrency?: 'EUR' | 'TND' | 'USD';
  promoEnabled?: boolean;
  promoPriceEur?: number;
  promoPriceTnd?: number;
  promoPriceUsd?: number;
  category: string;
  status: 'published' | 'draft';
  presentation?: string;
  warning?: string;
  objectives?: string[];
  contentItems?: Array<{
    id: string;
    text: string;
  }>;
  chapters?: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  moduleItems?: Array<{
    id: string;
    title: string;
    pdfName: string;
    pdfDataUrl: string;
  }>;
}

export interface PublicCatalogFormula {
  id: string;
  title: string;
  description: string;
  image: string;
  highlights: string[];
  priceEur: number;
  priceTnd?: number;
  priceUsd?: number;
  pricingCurrency?: 'EUR' | 'TND' | 'USD';
  promoEnabled?: boolean;
  promoPriceEur?: number;
  promoPriceTnd?: number;
  promoPriceUsd?: number;
  status: 'published' | 'draft';
  activePriceEur: number;
  activePriceTnd: number;
  activePriceUsd: number;
}

export interface PublicCatalogResponse {
  courses: PublicCatalogCourse[];
  formulas: PublicCatalogFormula[];
}

export interface PublicEnrollmentPayload {
  courseId: string;
  formulaId?: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  message: string;
}

export interface PublicEnrollmentResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PublicCatalogService {
  private http = inject(HttpClient);

  getCatalog(): Observable<PublicCatalogResponse> {
    return this.http.get<PublicCatalogResponse>('/api/public/formations');
  }

  createEnrollmentRequest(payload: PublicEnrollmentPayload): Observable<PublicEnrollmentResponse> {
    return this.http.post<PublicEnrollmentResponse>('/api/public/enrollment-requests', payload);
  }
}
