// Adventure books
import adv1p0 from '@/assets/pages/adv-1-p0.jpg';
import adv1p1 from '@/assets/pages/adv-1-p1.jpg';
import adv1p2 from '@/assets/pages/adv-1-p2.jpg';
import adv1p3 from '@/assets/pages/adv-1-p3.jpg';
import adv2p0 from '@/assets/pages/adv-2-p0.jpg';
import adv2p1 from '@/assets/pages/adv-2-p1.jpg';
import adv2p2 from '@/assets/pages/adv-2-p2.jpg';
import adv2p3 from '@/assets/pages/adv-2-p3.jpg';
import adv3p0 from '@/assets/pages/adv-3-p0.jpg';
import adv3p1 from '@/assets/pages/adv-3-p1.jpg';
import adv3p2 from '@/assets/pages/adv-3-p2.jpg';
import adv3p3 from '@/assets/pages/adv-3-p3.jpg';

// Fantasy books
import fan1p0 from '@/assets/pages/fan-1-p0.jpg';
import fan1p1 from '@/assets/pages/fan-1-p1.jpg';
import fan1p2 from '@/assets/pages/fan-1-p2.jpg';
import fan1p3 from '@/assets/pages/fan-1-p3.jpg';
import fan2p0 from '@/assets/pages/fan-2-p0.jpg';
import fan2p1 from '@/assets/pages/fan-2-p1.jpg';
import fan2p2 from '@/assets/pages/fan-2-p2.jpg';
import fan2p3 from '@/assets/pages/fan-2-p3.jpg';
import fan3p0 from '@/assets/pages/fan-3-p0.jpg';
import fan3p1 from '@/assets/pages/fan-3-p1.jpg';
import fan3p2 from '@/assets/pages/fan-3-p2.jpg';
import fan3p3 from '@/assets/pages/fan-3-p3.jpg';

// Animals books
import ani1p0 from '@/assets/pages/ani-1-p0.jpg';
import ani1p1 from '@/assets/pages/ani-1-p1.jpg';
import ani1p2 from '@/assets/pages/ani-1-p2.jpg';
import ani1p3 from '@/assets/pages/ani-1-p3.jpg';
import ani2p0 from '@/assets/pages/ani-2-p0.jpg';
import ani2p1 from '@/assets/pages/ani-2-p1.jpg';
import ani2p2 from '@/assets/pages/ani-2-p2.jpg';
import ani2p3 from '@/assets/pages/ani-2-p3.jpg';
import ani3p0 from '@/assets/pages/ani-3-p0.jpg';
import ani3p1 from '@/assets/pages/ani-3-p1.jpg';
import ani3p2 from '@/assets/pages/ani-3-p2.jpg';
import ani3p3 from '@/assets/pages/ani-3-p3.jpg';

// Action books
import act1p0 from '@/assets/pages/act-1-p0.jpg';
import act1p1 from '@/assets/pages/act-1-p1.jpg';
import act1p2 from '@/assets/pages/act-1-p2.jpg';
import act1p3 from '@/assets/pages/act-1-p3.jpg';
import act1p4 from '@/assets/pages/act-1-p4.jpg';
import act1p5 from '@/assets/pages/act-1-p5.jpg';
import act1p6 from '@/assets/pages/act-1-p6.jpg';
import act1p7 from '@/assets/pages/act-1-p7.jpg';
import act1p8 from '@/assets/pages/act-1-p8.jpg';
import act1p9 from '@/assets/pages/act-1-p9.jpg';
import act1p10 from '@/assets/pages/act-1-p10.jpg';
import act1p11 from '@/assets/pages/act-1-p11.jpg';
import act1p12 from '@/assets/pages/act-1-p12.jpg';
import act1p13 from '@/assets/pages/act-1-p13.jpg';
import act1p14 from '@/assets/pages/act-1-p14.jpg';
import act1p15 from '@/assets/pages/act-1-p15.jpg';
import act1p16 from '@/assets/pages/act-1-p16.jpg';
import act1p17 from '@/assets/pages/act-1-p17.jpg';
import act1p18 from '@/assets/pages/act-1-p18.jpg';
import act1p19 from '@/assets/pages/act-1-p19.jpg';

import act2p0 from '@/assets/pages/act-2-p0.jpg';
import act2p1 from '@/assets/pages/act-2-p1.jpg';
import act2p2 from '@/assets/pages/act-2-p2.jpg';
import act2p3 from '@/assets/pages/act-2-p3.jpg';
import act2p5 from '@/assets/pages/act-2-p5.jpg';
import act2p6 from '@/assets/pages/act-2-p6.jpg';
import act2p7 from '@/assets/pages/act-2-p7.jpg';
import act2p8 from '@/assets/pages/act-2-p8.jpg';
import act2p9 from '@/assets/pages/act-2-p9.jpg';
import act2p10 from '@/assets/pages/act-2-p10.jpg';
import act2p11 from '@/assets/pages/act-2-p11.jpg';
import act2p12 from '@/assets/pages/act-2-p12.jpg';
import act2p14 from '@/assets/pages/act-2-p14.jpg';
import act2p15 from '@/assets/pages/act-2-p15.jpg';
import act2p16 from '@/assets/pages/act-2-p16.jpg';
import act2p17 from '@/assets/pages/act-2-p17.jpg';
import act2p18 from '@/assets/pages/act-2-p18.jpg';
import act2p19 from '@/assets/pages/act-2-p19.jpg';

// Map: bookId -> pageIndex -> image
export const pageIllustrations: Record<string, Record<number, string>> = {
  'adv-1': { 0: adv1p0, 1: adv1p1, 2: adv1p2, 3: adv1p3 },
  'adv-2': { 0: adv2p0, 1: adv2p1, 2: adv2p2, 3: adv2p3 },
  'adv-3': { 0: adv3p0, 1: adv3p1, 2: adv3p2, 3: adv3p3 },
  'fan-1': { 0: fan1p0, 1: fan1p1, 2: fan1p2, 3: fan1p3 },
  'fan-2': { 0: fan2p0, 1: fan2p1, 2: fan2p2, 3: fan2p3 },
  'fan-3': { 0: fan3p0, 1: fan3p1, 2: fan3p2, 3: fan3p3 },
  'ani-1': { 0: ani1p0, 1: ani1p1, 2: ani1p2, 3: ani1p3 },
  'ani-2': { 0: ani2p0, 1: ani2p1, 2: ani2p2, 3: ani2p3 },
  'ani-3': { 0: ani3p0, 1: ani3p1, 2: ani3p2, 3: ani3p3 },
  'act-1': {
    0: act1p0, 1: act1p1, 2: act1p2, 3: act1p3, 4: act1p4,
    5: act1p5, 6: act1p6, 7: act1p7, 8: act1p8, 9: act1p9,
    10: act1p10, 11: act1p11, 12: act1p12, 13: act1p13, 14: act1p14,
    15: act1p15, 16: act1p16, 17: act1p17, 18: act1p18, 19: act1p19,
  },
  'act-2': {
    0: act2p0, 1: act2p1, 2: act2p2, 3: act2p3,
    5: act2p5, 6: act2p6, 7: act2p7, 8: act2p8, 9: act2p9,
    10: act2p10, 11: act2p11, 12: act2p12,
    14: act2p14, 15: act2p15, 16: act2p16, 17: act2p17, 18: act2p18, 19: act2p19,
  },
};
