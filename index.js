const { Telegraf, Markup } = require('telegraf');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ==================== CONFIG ====================
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN not found in .env file');
    process.exit(1);
}

// Use alternative API (more reliable)
const API_BASE = 'https://quranapi.pages.dev/api';

// Complete list of Quran reciters with their IDs
const RECITERS = {
    mishary: { id: 7, name: 'Mishary Al-Afasy' },
    abdul_basit: { id: 1, name: 'Abdul Basit' },
    sudais: { id: 6, name: 'Sudais' },
    husary: { id: 3, name: 'Husary' },
    ghamdi: { id: 9, name: 'Ghamdi' },
    shuraim: { id: 8, name: 'Shuraim' },
    maher: { id: 11, name: 'Maher Al Muaiqly' },
    yasser: { id: 19, name: 'Yasser Al Dosari' },
    bandar: { id: 20, name: 'Bandar Baleelah' },
    minshawi: { id: 5, name: 'Minshawi' },
    al_juhany: { id: 10, name: 'Al Juhany' },
    abdul_samad: { id: 2, name: 'Abdul Samad' },
    mustafa_ismail: { id: 4, name: 'Mustafa Ismail' },
    salah_bukhatir: { id: 13, name: 'Salah Bukhatir' },
    nasser_alqatami: { id: 14, name: 'Nasser Alqatami' },
    al_huthaify: { id: 15, name: 'Al Huthaify' },
    shatiri: { id: 16, name: 'Shatiri' },
    ali_jaber: { id: 17, name: 'Ali Jaber' },
    abdul_wadood: { id: 18, name: 'Abdul Wadood' },
    ibrahim_akhdar: { id: 21, name: 'Ibrahim Akhdar' }
};

const DEFAULT_RECITER = 'mishary';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const bot = new Telegraf(BOT_TOKEN);
const userPrefs = new Map();

// ==================== HELPERS ====================
async function downloadMp3(url, surahNum, reciterName) {
    const filename = `surah_${String(surahNum).padStart(3, '0')}.mp3`;
    const filepath = path.join(DOWNLOAD_DIR, filename);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
    
    const buffer = await response.buffer();
    fs.writeFileSync(filepath, buffer);
    
    return { filepath, filename };
}

function getReciterName(reciterKey) {
    return RECITERS[reciterKey]?.name || RECITERS[DEFAULT_RECITER].name;
}

function getReciterId(reciterKey) {
    return RECITERS[reciterKey]?.id || RECITERS[DEFAULT_RECITER].id;
}

// ==================== MAIN MENU ====================
async function showMainMenu(ctx, edit = false) {
    const userId = ctx.from?.id || ctx.chat?.id;
    const currentReciter = userPrefs.get(userId)?.reciter || DEFAULT_RECITER;
    const reciterName = getReciterName(currentReciter);
    
    // Create surah buttons (1-114) in rows of 10
    const surahButtons = [];
    for (let i = 1; i <= 114; i += 10) {
        const row = [];
        for (let j = i; j < Math.min(i + 10, 115); j++) {
            row.push(Markup.button.callback(`${j}`, `surah_${j}`));
        }
        surahButtons.push(row);
    }
    
    const keyboard = Markup.inlineKeyboard([
        ...surahButtons,
        [Markup.button.callback('🎙️ Change Reciter', 'show_reciters')],
        [Markup.button.callback('ℹ️ Help', 'help')]
    ]);
    
    const message = `🎧 **Quran MP3 Downloader**\n\n` +
                    `👤 Reciter: *${reciterName}*\n` +
                    `📊 Select a surah number below:\n` +
                    `📦 Total: 114 Surahs\n\n` +
                    `💡 Click any number to download MP3`;
    
    if (edit && ctx.callbackQuery) {
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard.reply_markup
        });
    } else {
        await ctx.replyWithMarkdown(message, keyboard);
    }
}

// ==================== RECITER MENU ====================
async function showReciterMenu(ctx, edit = false) {
    const reciterButtons = Object.keys(RECITERS).map(key => {
        return [Markup.button.callback(
            `🎙️ ${RECITERS[key].name}`,
            `reciter_${key}`
        )];
    });
    
    reciterButtons.push([Markup.button.callback('🔙 Back to Surahs', 'back_menu')]);
    
    const keyboard = Markup.inlineKeyboard(reciterButtons);
    
    const message = `🎙️ **Select a Reciter:**\n\n` +
                    `Total: ${Object.keys(RECITERS).length} reciters available`;
    
    if (edit && ctx.callbackQuery) {
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard.reply_markup
        });
    } else {
        await ctx.replyWithMarkdown(message, keyboard);
    }
}

// ==================== START COMMAND ====================
bot.start(async (ctx) => {
    await showMainMenu(ctx);
});

// ==================== BUTTON HANDLERS ====================

// Handle surah selection
bot.action(/surah_(\d+)/, async (ctx) => {
    const surahNum = parseInt(ctx.match[1]);
    await ctx.answerCbQuery(`Downloading Surah ${surahNum}...`);
    
    const userId = ctx.from.id;
    const reciterKey = userPrefs.get(userId)?.reciter || DEFAULT_RECITER;
    const reciterName = getReciterName(reciterKey);
    const reciterId = getReciterId(reciterKey);
    
    // Send loading message
    const statusMsg = await ctx.reply(
        `⏳ Downloading Surah ${surahNum} from *${reciterName}*...`,
        { parse_mode: 'Markdown' }
    );
    
    try {
        // Using alternative API
        const apiUrl = `${API_BASE}/chapters/${surahNum}/recitations/${reciterId}/audio_files`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        
        if (!data.audio_files || data.audio_files.length === 0) {
            await ctx.reply(`❌ No audio found for Surah ${surahNum}`);
            await ctx.deleteMessage(statusMsg.message_id);
            return;
        }
        
        const audioUrl = data.audio_files[0].audio_url;
        const { filepath, filename } = await downloadMp3(audioUrl, surahNum, reciterName);
        
        // Send MP3
        await ctx.replyWithAudio(
            { source: filepath },
            {
                caption: `✅ *Surah ${surahNum}*\n🎙️ ${reciterName}`,
                parse_mode: 'Markdown',
                title: `Surah ${surahNum}`,
                performer: reciterName
            }
        );
        
        fs.unlinkSync(filepath);
        await ctx.deleteMessage(statusMsg.message_id);
        
        // Show surah menu again
        await showMainMenu(ctx, false);
        
    } catch (error) {
        console.error('Error:', error);
        await ctx.reply(`❌ Error: ${error.message}`);
        await ctx.deleteMessage(statusMsg.message_id);
    }
});

// Show reciters
bot.action('show_reciters', async (ctx) => {
    await ctx.answerCbQuery();
    await showReciterMenu(ctx, true);
});

// Handle reciter selection
Object.keys(RECITERS).forEach(key => {
    bot.action(`reciter_${key}`, async (ctx) => {
        const userId = ctx.from.id;
        const reciterName = RECITERS[key].name;
        
        if (!userPrefs.has(userId)) {
            userPrefs.set(userId, {});
        }
        userPrefs.get(userId).reciter = key;
        
        await ctx.answerCbQuery(`✅ Reciter changed to ${reciterName}`);
        await showMainMenu(ctx, true);
    });
});

// Back to menu
bot.action('back_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await showMainMenu(ctx, true);
});

// Help
bot.action('help', async (ctx) => {
    await ctx.answerCbQuery();
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Surahs', 'back_menu')]
    ]);
    
    await ctx.editMessageText(
        `📖 **How to use:**\n\n` +
        `✅ Click any surah number to download MP3\n` +
        `✅ Click "Change Reciter" to switch reciter\n` +
        `✅ All files are high quality (128kbps)\n\n` +
        `🎙️ **Available Reciters:** ${Object.keys(RECITERS).length}\n` +
        `📊 **Total Surahs:** 114\n\n` +
        `🔄 The bot remembers your reciter preference`,
        {
            parse_mode: 'Markdown',
            reply_markup: keyboard.reply_markup
        }
    );
});

// ==================== COMMAND HANDLERS ====================
bot.command('menu', async (ctx) => {
    await showMainMenu(ctx);
});

bot.command('reciters', async (ctx) => {
    await showReciterMenu(ctx);
});

// ==================== ERROR HANDLING ====================
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ Something went wrong. Please try again.');
});

// ==================== START BOT ====================
bot.launch()
    .then(() => {
        console.log('🤖 Quran MP3 Bot is running!');
        console.log(`📊 ${Object.keys(RECITERS).length} reciters loaded`);
        console.log(`🌐 Using API: ${API_BASE}`);
        console.log('💡 All controls are button-based!');
    })
    .catch(err => {
        console.error('Failed to start bot:', err);
        process.exit(1);
    });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
