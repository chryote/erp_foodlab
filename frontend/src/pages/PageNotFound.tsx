import React from 'react';
import { Compass, House } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';

export const PageNotFound: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-10">
      <Card className="relative w-full max-w-xl overflow-hidden p-4">
        <div className="h-1.5 bg-primary" />
        <div className="px-6 py-10 text-center sm:px-12 sm:py-14">
          <span className="mx-auto w-fit grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary p-2">
            <Compass aria-hidden="true" className="size-7" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Error 404
          </p>
          <p
            aria-hidden="true"
            className="mt-2 text-7xl font-black leading-none tracking-tighter text-foreground/5 sm:text-8xl"
          >
            404
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Halaman tidak ditemukan
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Halaman yang Anda cari mungkin sudah dipindahkan, dihapus, atau
            alamatnya tidak tepat.
          </p>
          <code className="mt-4 inline-block max-w-full truncate rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            {pathname}
          </code>
          <div className="mt-8">
            <Button
              variant="primary"
              onClick={() => navigate('/', { replace: true })}
            >
              <House aria-hidden="true" className="mr-2 size-4" />
              Kembali ke beranda
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Anda akan kembali ke halaman utama ERP FoodLab.
          </p>
        </div>
      </Card>
    </main>
  );
};

export default PageNotFound;
