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

// Complete list of Quran reciters with their IDs
const RECITERS = {
    // Famous reciters
    abdul_basit: { id: 1, name: 'Abdul Basit' },
    abdul_samad: { id: 2, name: 'Abdul Samad' },
    husary: { id: 3, name: 'Husary' },
    mustafa_ismail: { id: 4, name: 'Mustafa Ismail' },
    minshawi: { id: 5, name: 'Minshawi' },
    sudais: { id: 6, name: 'Sudais' },
    mishary: { id: 7, name: 'Mishary Al-Afasy' },
    shuraim: { id: 8, name: 'Shuraim' },
    ghamdi: { id: 9, name: 'Ghamdi' },
    al_juhany: { id: 10, name: 'Al Juhany' },
    maher_al_muaiqly: { id: 11, name: 'Maher Al Muaiqly' },
    al_afasy_128: { id: 12, name: 'Al Afasy (128kbps)' },
    salah_bukhatir: { id: 13, name: 'Salah Bukhatir' },
    nasser_alqatami: { id: 14, name: 'Nasser Alqatami' },
    al_huthaify: { id: 15, name: 'Al Huthaify' },
    shatiri: { id: 16, name: 'Shatiri' },
    ali_jaber: { id: 17, name: 'Ali Jaber' },
    abdul_wadood: { id: 18, name: 'Abdul Wadood' },
    yasser_al_dosari: { id: 19, name: 'Yasser Al Dosari' },
    bandar_baleelah: { id: 20, name: 'Bandar Baleelah' },
    
    // More reciters
    ibrahim_akhdar: { id: 21, name: 'Ibrahim Akhdar' },
    abdul_muhsin_al_qasim: { id: 22, name: 'Abdul Muhsin Al Qasim' },
    abdul_rahman_al_sudais: { id: 23, name: 'Abdul Rahman Al Sudais' },
    ahmad_al_ajami: { id: 24, name: 'Ahmad Al Ajami' },
    khalid_al_jalil: { id: 25, name: 'Khalid Al Jalil' },
    saad_al_ghamdi: { id: 26, name: 'Saad Al Ghamdi' },
    ali_al_hudhaify: { id: 27, name: 'Ali Al Hudhaify' },
    salman_al_utaybi: { id: 28, name: 'Salman Al Utaybi' },
    mohamed_ayyoub: { id: 29, name: 'Mohamed Ayyoub' },
    abdullah_basfar: { id: 30, name: 'Abdullah Basfar' },
    
    // Qira'at reciters
    warsh: { id: 31, name: 'Warsh (Nafi)' },
    qalun: { id: 32, name: 'Qalun (Nafi)' },
    al_bazzi: { id: 33, name: 'Al Bazzi (Ibn Kathir)' },
    qunbul: { id: 34, name: 'Qunbul (Ibn Kathir)' },
    shuayb: { id: 35, name: "Shu'ayb (Khalaf)" },
    al_azraq: { id: 36, name: 'Al Azraq (Hisham)' },
    ishaq: { id: 37, name: 'Ishaq (Khalaf)' },
    al_aysi: { id: 38, name: 'Al Aysi (Abu Ja'far)' },
    ibn_jummaz: { id: 39, name: 'Ibn Jummaz (Abu Ja'far)' },
    ruways: { id: 40, name: 'Ruways (Ya\'qub)' },
    rawh: { id: 41, name: 'Rawh (Ya\'qub)' },
    al_duri: { id: 42, name: 'Al Duri (Abu Amr)' },
    al_susi: { id: 43, name: 'Al Susi (Abu Amr)' },
    ibn_amir: { id: 44, name: 'Ibn Amir (Damascus)' },
    hisham: { id: 45, name: 'Hisham (Ibn Amir)' },
    ibn_dhakwan: { id: 46, name: 'Ibn Dhakwan (Ibn Amir)' },
    ibn_wardan: { id: 47, name: 'Ibn Wardan (Abu Ja\'far)' },
};

const DEFAULT_RECITER = 'mishary';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

// Create downloads folder if it doesn't exist
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// ==================== BOT SETUP ====================
const bot = new Telegraf(BOT_TOKEN);

// Store user preferences
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

// ==================== COMMANDS ====================

// Start command
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const currentReciter = userPrefs.get(userId)?.reciter || DEFAULT_RECITER;
    const reciterName = getReciterName(currentReciter);
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📥 Download Surah', 'download')],
        [Markup.button.callback('🎙️ Change Reciter', 'reciter')],
        [Markup.button.callback('📋 List Reciters', 'list_reciters')],
        [Markup.button.callback('ℹ️ Help', 'help')]
    ]);
    
    await ctx.replyWithMarkdown(
        `🎧 **Quran MP3 Downloader**\n\n` +
        `👤 Current Reciter: *${reciterName}*\n\n` +
        `📤 Send a surah number (1-114) to download MP3\n` +
        `Or use the buttons below:`,
        keyboard
    );
});

// Help command
bot.command('help', async (ctx) => {
    await ctx.replyWithMarkdown(
        `📖 **How to use:**\n\n` +
        `1️⃣ Send a number between *1-114* to download a surah\n` +
        `2️⃣ Use /reciter to change the reciter\n` +
        `3️⃣ Use /list to see all available reciters\n` +
        `4️⃣ Use /start to see the main menu\n\n` +
        `🎙️ **Total Reciters:** ${Object.keys(RECITERS).length}\n\n` +
        `🔊 All MP3s are high quality (128kbps)`
    );
});

// Reciter command
bot.command('reciter', async (ctx) => {
    await showReciterMenu(ctx);
});

// List reciters command
bot.command('list', async (ctx) => {
    const reciterList = Object.values(RECITERS)
        .map((r, i) => `${i+1}. ${r.name}`)
        .join('\n');
    
    await ctx.replyWithMarkdown(
        `🎙️ **All Available Reciters (${Object.keys(RECITERS).length}):**\n\n` +
        reciterList +
        `\n\n💡 Use /reciter to change your reciter`
    );
});

// Download command
bot.command('download', async (ctx) => {
    await ctx.reply('📤 Send the surah number (1-114)');
});

// ==================== BUTTON HANDLERS ====================

bot.action('download', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        '📤 **Send the surah number** (1-114)\n\n' +
        'Example: `7` for Al-Fatihah',
        { parse_mode: 'Markdown' }
    );
});

bot.action('reciter', async (ctx) => {
    await ctx.answerCbQuery();
    await showReciterMenu(ctx);
});

bot.action('list_reciters', async (ctx) => {
    await ctx.answerCbQuery();
    const reciterList = Object.values(RECITERS)
        .map((r, i) => `${i+1}. ${r.name}`)
        .join('\n');
    
    await ctx.editMessageText(
        `🎙️ **All Available Reciters (${Object.keys(RECITERS).length}):**\n\n` +
        reciterList +
        `\n\n💡 Use /reciter to change your reciter`,
        { parse_mode: 'Markdown' }
    );
});

bot.action('help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `📖 **How to use:**\n\n` +
        `1️⃣ Send a number between *1-114* to download a surah\n` +
        `2️⃣ Use /reciter to change the reciter\n` +
        `3️⃣ Use /start to see the main menu\n\n` +
        `🎙️ **Total Reciters:** ${Object.keys(RECITERS).length}\n\n` +
        `🔊 All MP3s are high quality (128kbps)`,
        { parse_mode: 'Markdown' }
    );
});

// Reciter selection - dynamically handle all reciters
Object.keys(RECITERS).forEach(key => {
    bot.action(`reciter_${key}`, async (ctx) => {
        const userId = ctx.from.id;
        const
