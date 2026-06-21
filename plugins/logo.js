const { cmd, commands } = require('../command');
const axios = require('axios');

// Logo types from the API
const logoTypes = [
    'neon', 'neon2', 'fire2', 'glitch', 'hacker', 'futuristic', 'thunder',
    'devil', 'fire', 'ice', 'snow', 'lava', 'metal', 'gold', 'silver',
    'glossy', 'blackpink', 'transformer', 'horror', 'blood', 'joker',
    'galaxy', 'space', 'cloud', 'sand', 'stone', 'magma', 'gradient',
    'light', 'paper', 'watercolor', 'candy', 'christmas', 'luxury',
    'leaf', 'summer', 'circuit', 'block3d', 'cartoon', 'chrome', 'frozen'
];

// Descriptions for each logo type
const logoDescriptions = {
    neon: 'Neon glow text effect',
    neon2: 'Neon 2.0 text effect',
    fire2: 'Fire 2.0 text effect',
    glitch: 'Glitch text effect',
    hacker: 'Hacker style text effect',
    futuristic: 'Futuristic text effect',
    thunder: 'Thunder text effect',
    devil: 'Devil style text effect',
    fire: 'Fire text effect',
    ice: 'Ice text effect',
    snow: 'Snow text effect',
    lava: 'Lava text effect',
    metal: 'Metal text effect',
    gold: 'Gold text effect',
    silver: 'Silver text effect',
    glossy: 'Glossy text effect',
    blackpink: 'Blackpink style text effect',
    transformer: 'Transformer style text effect',
    horror: 'Horror text effect',
    blood: 'Blood style text effect',
    joker: 'Joker style text effect',
    galaxy: 'Galaxy text effect',
    space: 'Space text effect',
    cloud: 'Cloud text effect',
    sand: 'Sand text effect',
    stone: 'Stone text effect',
    magma: 'Magma text effect',
    gradient: 'Gradient text effect',
    light: 'Light text effect',
    paper: 'Paper text effect',
    watercolor: 'Watercolor text effect',
    candy: 'Candy text effect',
    christmas: 'Christmas text effect',
    luxury: 'Luxury text effect',
    leaf: 'Leaf text effect',
    summer: 'Summer text effect',
    circuit: 'Circuit text effect',
    block3d: '3D Block text effect',
    cartoon: 'Cartoon text effect',
    chrome: 'Chrome text effect',
    frozen: 'Frozen text effect'
};

const API_KEY = 'key_faa62e4037a95cda';
const BASE_URL = 'https://mr-thinuzz-api-build.vercel.app/api/logo';

async function createLogo(type, text) {
    try {
        const url = `${BASE_URL}?name=${encodeURIComponent(text)}&type=${type}&apiKey=${API_KEY}`;
        
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        if (response.status === 200) {
            return {
                success: true,
                imageBuffer: Buffer.from(response.data),
                type: type,
                text: text
            };
        } else {
            return {
                success: false,
                error: `API returned status ${response.status}`
            };
        }
    } catch (error) {
        console.error('Logo API Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Register command for each logo type
for (const type of logoTypes) {
    cmd({
        pattern: type,
        desc: logoDescriptions[type] || `${type} text effect`,
        category: "logo",
        react: "🎨",
        filename: __filename
    }, async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(`❌ Please provide text.\nExample: .${type} Your Text`);
            }

            const text = args.join(" ");
            await reply(`⏳ Creating ${type} logo...`);

            const result = await createLogo(type, text);

            if (!result.success) {
                return reply(`❌ Failed to create logo: ${result.error}`);
            }

            await conn.sendMessage(from, {
                image: result.imageBuffer,
                caption: `✨ ${type.charAt(0).toUpperCase() + type.slice(1)}: ${text}`
            });

        } catch (e) {
            console.error(e);
            return reply(`❌ Error: ${e.message}`);
        }
    });
}

// PATTERN LOGO COMMAND - Main command with style selection
cmd({
    pattern: "logo",
    desc: "Create pattern logos with various styles",
    category: "logo",
    react: "🎨",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        if (args.length < 2) {
            return reply(`❌ Please provide style and text.\n\n*Usage:* .logo <style> <text>\n*Example:* .logo neon Hello World\n\n*Available styles:* ${logoTypes.join(', ')}\n\nUse .logotypes to see all styles with descriptions.`);
        }

        const type = args[0].toLowerCase();
        const text = args.slice(1).join(" ");

        if (!logoTypes.includes(type)) {
            return reply(`❌ Invalid logo style: ${type}\n\n*Available styles:* ${logoTypes.join(', ')}\n\nUse .logotypes for detailed information.`);
        }

        await reply(`⏳ Creating ${type} pattern logo...`);

        const result = await createLogo(type, text);

        if (!result.success) {
            return reply(`❌ Failed to create logo: ${result.error}`);
        }

        await conn.sendMessage(from, {
            image: result.imageBuffer,
            caption: `✨ *${type.charAt(0).toUpperCase() + type.slice(1)} Pattern Logo*\n📝 Text: ${text}\n🎨 Style: ${type}\n\nPowered by Logo API`
        });

    } catch (e) {
        console.error(e);
        return reply(`❌ Error: ${e.message}`);
    }
});

// PATTERN LOGO SHORT COMMAND - Alternative with .pl
cmd({
    pattern: "pl",
    desc: "Create pattern logos (shortcut)",
    category: "logo",
    react: "🎨",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        if (args.length < 2) {
            return reply(`❌ Please provide style and text.\n\n*Usage:* .pl <style> <text>\n*Example:* .pl glitch My Text\n\n*Available styles:* ${logoTypes.join(', ')}`);
        }

        const type = args[0].toLowerCase();
        const text = args.slice(1).join(" ");

        if (!logoTypes.includes(type)) {
            return reply(`❌ Invalid logo style.\n\n*Available styles:* ${logoTypes.join(', ')}`);
        }

        await reply(`⏳ Creating ${type} pattern logo...`);

        const result = await createLogo(type, text);

        if (!result.success) {
            return reply(`❌ Failed to create logo: ${result.error}`);
        }

        await conn.sendMessage(from, {
            image: result.imageBuffer,
            caption: `✨ *${type} Pattern Logo*\n📝 ${text}`
        });

    } catch (e) {
        console.error(e);
        return reply(`❌ Error: ${e.message}`);
    }
});

// Additional command to list all available logo types
cmd({
    pattern: "logotypes",
    desc: "Get list of all available logo types",
    category: "logo",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        let message = "*📋 Available Pattern Logo Styles:*\n\n";
        
        // Group styles in columns for better display
        const columns = 3;
        const itemsPerColumn = Math.ceil(logoTypes.length / columns);
        
        for (let i = 0; i < itemsPerColumn; i++) {
            let line = '';
            for (let j = 0; j < columns; j++) {
                const index = i + (j * itemsPerColumn);
                if (index < logoTypes.length) {
                    const type = logoTypes[index];
                    const desc = logoDescriptions[type] || '';
                    line += `│ ${type.padEnd(12)} `;
                }
            }
            message += line + '\n';
        }
        
        message += `\n*Total Styles:* ${logoTypes.length}\n`;
        message += `\n*Usage:* .logo <style> <text>\n`;
        message += `*Example:* .logo neon Hello World\n\n`;
        message += `*Quick Commands:* Use .<style> <text>\n`;
        message += `*Example:* .glitch My Text`;

        await reply(message);
    } catch (e) {
        console.error(e);
        return reply(`❌ Error: ${e.message}`);
    }
});

// Command to get info about a specific logo type
cmd({
    pattern: "logoinfo",
    desc: "Get information about a specific logo type",
    category: "logo",
    react: "ℹ️",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        if (!args.length) {
            return reply(`❌ Please provide a logo type.\nExample: .logoinfo neon`);
        }

        const type = args[0].toLowerCase();
        if (!logoTypes.includes(type)) {
            return reply(`❌ Invalid logo type. Use .logotypes to see all available types.`);
        }

        const desc = logoDescriptions[type] || 'No description available';
        const message = `*ℹ️ Pattern Logo Info*\n\n` +
                       `*Style:* ${type}\n` +
                       `*Description:* ${desc}\n` +
                       `*Commands:*\n` +
                       `  • .logo ${type} Your Text\n` +
                       `  • .pl ${type} Your Text\n` +
                       `  • .${type} Your Text\n` +
                       `*API:* ${BASE_URL}`;

        await reply(message);
    } catch (e) {
        console.error(e);
        return reply(`❌ Error: ${e.message}`);
    }
});

// Random logo command
cmd({
    pattern: "randomlogo",
    desc: "Create a random pattern logo",
    category: "logo",
    react: "🎲",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        if (!args.length) {
            return reply(`❌ Please provide text.\nExample: .randomlogo Your Text`);
        }

        const text = args.join(" ");
        const randomType = logoTypes[Math.floor(Math.random() * logoTypes.length)];
        
        await reply(`⏳ Creating random ${randomType} pattern logo...`);

        const result = await createLogo(randomType, text);

        if (!result.success) {
            return reply(`❌ Failed to create logo: ${result.error}`);
        }

        await conn.sendMessage(from, {
            image: result.imageBuffer,
            caption: `🎲 *Random Pattern Logo*\n📝 Text: ${text}\n🎨 Style: ${randomType}\n\nTry .logo ${randomType} Your Text for more!`
        });

    } catch (e) {
        console.error(e);
        return reply(`❌ Error: ${e.message}`);
    }
});

// Pattern logo with gradient
cmd({
    pattern: "gradientlogo",
    desc: "Create gradient pattern logo",
    category: "logo",
    react: "🌈",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        if (!args.length) {
            return reply(`❌ Please provide text.\nExample: .gradientlogo Your Text`);
        }

        const text = args.join(" ");
        const type = 'gradient';
        
        await reply(`⏳ Creating gradient pattern logo...`);

        const result = await createLogo(type, text);

        if (!result.success) {
            return reply(`❌ Failed to create logo: ${result.error}`);
        }

        await conn.sendMessage(from, {
            image: result.imageBuffer,
            caption: `🌈 *Gradient Pattern Logo*\n📝 ${text}`
        });

    } catch (e) {
        console.error(e);
        return reply(`❌ Error: ${e.message}`);
    }
});
