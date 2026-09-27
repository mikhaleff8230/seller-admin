import Image from 'next/image';
import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';
import Loader from '@/components/ui/loader/loader';
import { useMeQuery } from '@/data/user';
import SellerSidebarMenu from '@/components/layouts/navigation/seller-sidebar-menu';

const UserDetails: React.FC = () => {
  const { data, isLoading: loading } = useMeQuery();
  if (loading) return <Loader text="Загрузка…" />;

  return (
    <div className="flex h-full flex-col items-center px-1 py-3">
      <Link href={Routes.profileUpdate} className="flex w-full items-center gap-3 rounded-2xl bg-[#f7f9fc] p-2.5 transition hover:bg-[#f1f4f8]">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e5eaf2] bg-white">
          <Image
            src={data?.profile?.avatar?.thumbnail ?? '/avatar-placeholder.svg'}
            fill
            sizes="44px"
            alt={data?.name ?? ''}
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-[#252b3d]">{data?.name}</h3>
          <p className="mt-0.5 truncate text-[10px] text-[#929bad]">{data?.email}</p>
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#647087]">
            <span className={`h-1.5 w-1.5 rounded-full ${data?.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {data?.is_active ? 'Продавец активен' : 'Продавец отключён'}
          </span>
        </div>
      </Link>
      <SellerSidebarMenu />
    </div>
  );
};
export default UserDetails;
