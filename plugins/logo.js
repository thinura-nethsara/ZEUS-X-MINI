const { cmd, commands } = require('../command');
const Photo360 = require('abir-photo360-apis');

const effects = {
    naruto: {
        url: 'https://en.ephoto360.com/naruto-shippuden-logo-style-text-effect-online-808.html',
        desc: 'Naruto Shippuden style text effect'
    },
    dragonball: {
        url: 'https://en.ephoto360.com/create-dragon-ball-style-text-effects-online-809.html',
        desc: 'Dragon Ball style text effect'
    },
    onepiece: {
        url: 'https://en.ephoto360.com/create-one-piece-logo-style-text-effect-online-814.html',
        desc: 'One Piece logo style text effect'
    },

    '3dcomic': {
        url: 'https://en.ephoto360.com/create-online-3d-comic-style-text-effects-817.html',
        desc: '3D Comic style text effect'
    },
    marvel: {
        url: 'https://en.ephoto360.com/create-3d-marvel-logo-style-text-effect-online-811.html',
        desc: 'Marvel logo style text effect'
    },
    deadpool: {
        url: 'https://en.ephoto360.com/create-text-effects-in-the-style-of-the-deadpool-logo-818.html',
        desc: 'Deadpool logo style text effect'
    },

    blackpink: {
        url: 'https://en.ephoto360.com/create-a-blackpink-style-logo-with-members-signatures-810.html',
        desc: 'Blackpink style logo with signatures'
    },
    harrypotter: {
        url: 'https://en.ephoto360.com/create-harry-potter-logo-style-text-effect-online-815.html',
        desc: 'Harry Potter logo style text effect'
    },
    glitch: {
        url: 'https://en.ephoto360.com/create-a-glitch-text-effect-online-812.html',
        desc: 'Glitch text effect'
    },
    rainbow: {
        url: 'https://en.ephoto360.com/create-rainbow-text-effects-online-801.html',
        desc: 'Rainbow text effect'
    },
    glass: {
        url: 'https://en.ephoto360.com/create-glass-text-effect-online-821.html',
        desc: 'Transparent glass text effect'
    },
    frostedGlass: {
        url: 'https://en.ephoto360.com/create-frosted-glass-text-effect-online-822.html',
        desc: 'Frosted glass text effect'
    },
    neonGlass: {
        url: 'https://en.ephoto360.com/create-3d-neon-glass-text-effect-online-823.html',
        desc: '3D neon glass text effect'
    },

    gold: {
        url: 'https://en.ephoto360.com/create-golden-metal-text-effect-online-804.html',
        desc: 'Golden metal text effect'
    },
    silver: {
        url: 'https://en.ephoto360.com/create-silver-metal-text-effect-online-806.html',
        desc: 'Silver metal text effect'
    },
    diamond: {
        url: 'https://en.ephoto360.com/create-diamond-text-effect-online-807.html',
        desc: 'Diamond text effect'
    },
    water: {
        url: 'https://en.ephoto360.com/create-underwater-text-effect-online-803.html',
        desc: 'Underwater text effect'
    },
    smoke: {
        url: 'https://en.ephoto360.com/create-smoky-text-effect-online-799.html',
        desc: 'Smoky text effect'
    },
    ice: {
        url: 'https://en.ephoto360.com/create-ice-text-effect-online-824.html',
        desc: 'Frozen ice text effect'
    },
    crystal: {
        url: 'https://en.ephoto360.com/create-crystal-text-effect-online-825.html',
        desc: 'Shiny crystal text effect'
    },
    modern: {
        url: 'https://en.ephoto360.com/create-modern-metallic-text-effect-online-819.html',
        desc: 'Modern metallic text effect'
    },
    christmas: {
        url: 'https://en.ephoto360.com/create-christmas-text-effect-online-798.html',
        desc: 'Christmas text effect'
    },
    halloween: {
        url: 'https://en.ephoto360.com/create-halloween-pumpkin-text-effect-online-796.html',
        desc: 'Halloween pumpkin text effect'
    },
    graffiti: {
        url: 'https://en.ephoto360.com/create-graffiti-text-effects-online-795.html',
        desc: 'Graffiti text effect'
    },
    sand: {
        url: 'https://en.ephoto360.com/write-text-on-the-beach-sand-online-794.html',
        desc: 'Beach sand text effect'
    },
    sky: {
        url: 'https://en.ephoto360.com/write-text-on-the-cloud-sky-online-793.html',
        desc: 'Cloud sky text effect'
    },
    space: {
        url: 'https://en.ephoto360.com/create-galaxy-text-effect-online-792.html',
        desc: 'Galaxy text effect'
    }
};


async function createLogo(effectUrl, text) {
    try {
        const generator = new Photo360(effectUrl);
        generator.setName(text);

        const result = await generator.execute();

        if (result.status && result.imageUrl) {
            return {
                success: true,
                imageUrl: result.imageUrl,
                sessionId: result.sessionId
            };
        } else {
            return {
                success: false,
                error: 'Failed to generate image'
            };
        }
    } catch (error) {
        console.error('Photo360 Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

for (const [effectName, effectInfo] of Object.entries(effects)) {
    cmd({
        pattern: effectName,
        desc: effectInfo.desc,
        category: "logo",
        react: "🎨",
        filename: __filename
    }, async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(`❌ Please provide text.\nExample: .${effectName} Your Text`);
            }

            const text = args.join(" ");
            await reply(`⏳ Creating ${effectName} logo...`);

            const result = await createLogo(effectInfo.url, text);

            if (!result.success) {
                return reply(`❌ Failed to create logo: ${result.error}`);
            }

            await conn.sendMessage(from, {
                image: { url: result.imageUrl },
                caption: `✨ ${effectName.charAt(0).toUpperCase() + effectName.slice(1)}: ${text}`
            });

        } catch (e) {
            console.error(e);
            return reply(`❌ Error: ${e.message}`);
        }
    });
}
