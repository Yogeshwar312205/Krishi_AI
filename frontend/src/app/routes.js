import { Sun, IndianRupee, Truck, Sprout, ClipboardList, Route, Store, PackageCheck, User } from 'lucide-react';

/**
 * Every destination in the app, in one table.
 *
 * Replaces the previous arrangement, where the tab list lived in Navbar.jsx,
 * the render branches lived in App.jsx, and the two had drifted apart — some
 * `activeTab` values were reachable from the nav but had no branch, and some
 * branches had no way to reach them.
 *
 * Each role gets at most four tabs. Four is not arbitrary: it is what fits a
 * mobile bottom bar at a 56px target with Devanagari labels that do not
 * truncate. A fifth tab would shrink every target to buy a destination the
 * farmer did not ask for.
 */

export const ROLES = {
  FARMER: 'Farmer',
  DRIVER: 'Driver',
  BUYER: 'APMC Buyer',
};

/** Older stored sessions and the backend use several spellings for each role. */
export const normaliseRole = (role) => {
  if (role === 'Transporter' || role === 'Driver') return ROLES.DRIVER;
  if (role === 'Trader' || role === 'Buyer' || role === 'APMC Buyer') return ROLES.BUYER;
  return ROLES.FARMER;
};

const FARMER_TABS = [
  { id: 'today',     labelKey: 'nav.farmer.today',     icon: Sun },
  { id: 'price',     labelKey: 'nav.farmer.price',     icon: IndianRupee },
  { id: 'transport', labelKey: 'nav.farmer.transport', icon: Truck },
  { id: 'crop',      labelKey: 'nav.farmer.crop',      icon: Sprout },
];

const DRIVER_TABS = [
  { id: 'driver-jobs',     labelKey: 'nav.driver.jobs',     icon: ClipboardList },
  { id: 'driver-route',    labelKey: 'nav.driver.route',    icon: Route },
  { id: 'driver-vehicles', labelKey: 'nav.driver.vehicles', icon: Truck },
];

const BUYER_TABS = [
  { id: 'buyer-rates',   labelKey: 'nav.buyer.rates',   icon: Store },
  { id: 'buyer-inbound', labelKey: 'nav.buyer.inbound', icon: PackageCheck },
  { id: 'buyer-profile', labelKey: 'nav.buyer.profile', icon: User },
];

export const TABS_BY_ROLE = {
  [ROLES.FARMER]: FARMER_TABS,
  [ROLES.DRIVER]: DRIVER_TABS,
  [ROLES.BUYER]: BUYER_TABS,
};

/**
 * Profile is a destination but not a tab.
 *
 * It used to be bolted onto the bottom of the farmer's "My crop" screen, which
 * put "log out" and "what am I growing" on the same scroll — two things that
 * have nothing to do with each other and are edited at completely different
 * frequencies. It gets its own screen now.
 *
 * It is NOT in the nav lists, and that is the point. The bottom bar holds four
 * items at a 56px target with Devanagari labels; a fifth shrinks every one of
 * them to buy a screen a farmer opens roughly twice — once to check their
 * number, once to sign out. So the way in is the identity chip in the top bar,
 * which is where a user already looks for their own account.
 */
export const PROFILE_TAB = 'profile';

export const tabsForRole = (role) => TABS_BY_ROLE[normaliseRole(role)] || FARMER_TABS;

export const defaultTabForRole = (role) => tabsForRole(role)[0].id;

/** True when `tabId` is reachable in `role` — used to recover from a stale stored tab. */
export const isTabValidForRole = (tabId, role) =>
  tabId === PROFILE_TAB || tabsForRole(role).some((tab) => tab.id === tabId);

export const ALL_TAB_IDS = [
  ...[...FARMER_TABS, ...DRIVER_TABS, ...BUYER_TABS].map((t) => t.id),
  PROFILE_TAB,
];
