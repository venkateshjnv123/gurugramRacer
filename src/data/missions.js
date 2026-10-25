// minutes = game minutes (1 real s = TIME.scale game s). Limits are ~1.5x the best possible
// ride along the shortest route, plus slack for jams (see PLAN.md §1b).
// startsAt = [hour (24h), minute] on the game clock.
export const MISSIONS = [
  { id: 'interview', title: 'Interview at 10 baje',
    from: 'ambience', to: 'vatika', minutes: 13, startsAt: [9, 47], night: false,
    brief: 'HR already gussa hai. Late hua toh "we will get back to you".',
    events: ['cow', 'thar', 'challan', 'gaaglu'] },

  { id: 'cake', title: 'Birthday cake delivery',
    from: 'medanta', to: 'cyberhub', minutes: 8, startsAt: [19, 52], night: false,
    brief: 'Dost ka birthday. Cake tere paas hai. Cake gira toh dosti khatam.',
    special: 'cakeMeter', // each collision -20%, 0% = fail
    events: ['auto', 'thar', 'construction'] },

  { id: 'chai', title: '₹40 ki chai, ₹40 crore ka flat',
    from: 'iffco', to: 'sector54', minutes: 6, startsAt: [16, 54], night: false,
    brief: 'Golf Course Road ke penthouse mein chai deliver kar. Thandi nahi honi chahiye.',
    special: 'chaiTemp', // temperature drops over time (faster when stuck); cold = fail
    events: ['uturn', 'challan', 'cow'] },

  { id: 'rain', title: 'Barish se pehle ghar',
    from: 'mgroad', to: 'herohonda', minutes: 7, startsAt: [18, 23], night: false,
    brief: 'Bas 1 baadal hai, kuch nahi hoga. (Hoga.)',
    special: 'rainAlways', // rain starts at 50% time no matter what → waterlogging at herohonda
    events: ['waterlogging', 'auto'] },

  { id: 'night', title: '2 AM — Cyber Hub se ghar',
    from: 'cyberhub', to: 'sector54', minutes: 7, startsAt: [2, 0], night: true,
    brief: 'Party khatam. Fog itna ki apni bike bhi nahi dikh rahi.',
    events: ['cow', 'thar', 'invisibleTruck'] },
];
