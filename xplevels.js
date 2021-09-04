const roles = [
    rookie_role, 
    leylite_role, 
    veteran_role, 
    epic_role, 
    supreme_role
] = [
    '865769192896462909',
	'869252641736253440',
	'869252677996015666',
	'869252715316932628',
	'869252759482929263',
];

export default {
	ROLES: roles,
	LEVELS: [
		{
			number: 0,
			requirements: {
				posts: 0,
			},
			rewards: [],
			xp: 0,
		},
		{
			number: 1,
			requirements: {
				posts: 1,
			},
			rewards: [
				{
					function: 'awardRole',
					args: {
						role_id: rookie_role,
					},
				},
				{
					function: 'awardNFT',
					args: {
						rarity: 'COMMON',
					},
				},
			],
			xp: 5,
		},
		{
			number: 2,
			requirements: {
				posts: 5,
			},
			rewards: [],
			xp: 30,
		},
		{
			number: 3,
			requirements: {
				posts: 10,
			},
			rewards: [
				{
					function: 'awardNFT',
					args: {
						rarity: 'UNCOMMON',
					},
				},
			],
			xp: 60,
		},
		{
			number: 4,
			requirements: {
				posts: 15,
			},
			rewards: [],
			xp: 90,
		},
		{
			number: 5,
			requirements: {
				posts: 20,
			},
			rewards: [
				{
					function: 'awardRole',
					args: {
						role_id: leylite_role,
					},
				},
				{
					function: 'awardNFT',
					args: {
						rarity: 'RARE',
					},
				},
			],
			xp: 120,
		},
		{
			number: 6,
			requirements: {
				posts: 25,
			},
			rewards: [],
			xp: 150,
		},
		{
			number: 7,
			requirements: {
				posts: 30,
			},
			rewards: [
				{
					function: 'awardNFT',
					args: {
						rarity: 'UNCOMMON',
					},
				},
			],
			xp: 180,
		},
		{
			number: 8,
			requirements: {
				posts: 40,
			},
			rewards: [],
			xp: 240,
		},
		{
			number: 9,
			requirements: {
				posts: 50,
			},
			rewards: [],
			xp: 300,
		},
		{
			number: 10,
			requirements: {
				posts: 60,
			},
			rewards: [
				{
					function: 'awardRole',
					args: {
						role_id: veteran_role,
					},
				},
				{
					function: 'awardNFT',
					args: {
						rarity: 'RARE',
					},
				},
			],
			xp: 360,
		},
		{
			number: 11,
			requirements: {
				posts: 70,
			},
			rewards: [],
			xp: 420,
		},
		{
			number: 12,
			requirements: {
				posts: 80,
			},
			rewards: [],
			xp: 480,
		},
		{
			number: 13,
			requirements: {
				posts: 90,
			},
			rewards: [
				{
					function: 'awardNFT',
					args: {
						rarity: 'COMMON',
					},
				},
			],
			xp: 540,
		},
		{
			number: 14,
			requirements: {
				posts: 100,
			},
			rewards: [],
			xp: 600,
		},
		{
			number: 15,
			requirements: {
				posts: 120,
			},
			rewards: [
				{
					function: 'awardRole',
					args: {
						role_id: epic_role,
					},
				},
				{
					function: 'awardNFT',
					args: {
						rarity: 'UNCOMMON',
					},
				},
			],
			xp: 720,
		},
		/*
        {
            number: 16,
            requirements: {
                posts: 135,
            },
            rewards: [],
        },
        {
            number: 17,
            requirements: {
                posts: 150,
            },
            rewards: [
                {
                    function: 'awardNFT',
                    args: {
                        rarity: 'COMMON',
                    },
                },
            ],
        },
        {
            number: 18,
            requirements: {
                posts: 175,
            },
            rewards: [
                {
                    function: 'awardNFT',
                    args: {
                        rarity: 'UNCOMMON',
                    },
                },
            ],
        },
        {
            number: 19,
            requirements: {
                posts: 185,
            },
            rewards: [],
        },
        {
            number: 20,
            requirements: {
                posts: 200,
            },
            rewards: [
                {
                    function: 'awardRole',
                    args: {
                        role_id: supreme_role,
                    },
                },
                {
                    function: 'awardNFT',
                    args: {
                        rarity: 'RARE',
                    },
                },
            ],
        },
        */
	],
};
