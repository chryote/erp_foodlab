import React from 'react';
import { Card, CardHeader } from '@/components/ui/Card';

export interface MenuPlaceholderPageProps {
  moduleCode: string;
  menuTitle: string;
  itemTitle: string;
}

export const MenuPlaceholderPage: React.FC<MenuPlaceholderPageProps> = ({
  moduleCode,
  menuTitle,
  itemTitle,
}) => (
  <Card className="mx-auto max-w-4xl">
    <CardHeader
      eyebrow={`${moduleCode} / ${menuTitle}`}
      title={itemTitle}
      subtitle="Halaman ini disiapkan sebagai placeholder untuk menu ini."
    />
    <div className="px-6 pb-6 text-sm text-muted-foreground">
      Konten {itemTitle} akan tersedia di sini.
    </div>
  </Card>
);
