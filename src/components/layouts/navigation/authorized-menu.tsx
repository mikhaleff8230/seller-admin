import cn from 'classnames';
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import Avatar from '@/components/common/avatar';
import Link from '@/components/ui/link';
import { siteSettings } from '@/settings/site.settings';
import { useTranslation } from 'next-i18next';
import { useMeQuery } from '@/data/user';

export default function AuthorizedMenu() {
	const { data } = useMeQuery();
	const { t } = useTranslation("common");

	// Again, we're using framer-motion for the transition effect
	return (
		<Menu as="div" className="relative inline-block text-left">
			<Menu.Button className="flex items-center focus:outline-none">
				<Avatar
					src={
						data?.profile?.avatar?.thumbnail ??
						siteSettings?.avatar?.placeholder
					}
					alt="avatar"
				/>
			</Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          as="ul"
          className="end-0 origin-top-end absolute mt-1 w-64 rounded bg-white shadow-md focus:outline-none"
        >
          <Menu.Item key={data?.email}>
            <li
              className="w-full flex flex-col space-y-1 bg-[#00b791]
             text-white text-sm rounded-t px-4 py-3"
						>
							<span className="font-semibold capitalize">{data?.name}</span>
							<span className="text-xs">{data?.email}</span>
						</li>
					</Menu.Item>

					{siteSettings.authorizedLinks.map((item) => {
							const label = 'label' in item ? item.label : t(item.labelTransKey);
							const className = (active: boolean) => cn(
								"flex items-center gap-2 px-4 py-3 text-sm font-semibold transition duration-200 hover:text-accent",
								active ? "text-accent" : "text-heading"
							);

							return (
						<Menu.Item key={item.href}>
							{({ active }) => (
								<li className="border-b border-gray-100 cursor-pointer last:border-0">
									{'external' in item && item.external ? (
										<a href={item.href} target="_blank" rel="noopener noreferrer" className={className(active)}>
											{'icon' in item && item.icon === 'telegram' && (
												<svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#229ED9]" fill="currentColor">
													<path d="M21.94 4.66a1.5 1.5 0 0 0-1.67-.22L3.46 10.92c-1.15.45-1.13 1.1-.2 1.39l4.31 1.35 1.67 5.15c.2.57.1.8.68.8.44 0 .64-.2.89-.44l2.08-2.02 4.33 3.2c.8.44 1.37.21 1.57-.74l2.84-13.4c.3-1.17-.44-1.7-1.69-1.55ZM9.3 13.35l8.4-5.3c.42-.25.8-.12.49.16l-6.93 6.25-.27 2.86-1.69-3.97Z" />
												</svg>
											)}
											<span>{label}</span>
										</a>
									) : (
										<Link href={item.href} className={className(active)}>{label}</Link>
									)}
								</li>
							)}
						</Menu.Item>
							);
						})}
				</Menu.Items>
			</Transition>
		</Menu>
	);
}
