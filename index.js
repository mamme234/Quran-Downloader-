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

// Complete list of Quran reciters with their IDs (escaped for safety)
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
    ibrahim_akhdar: { id: 21, name: 'Ibrahim Akhdar' },
    // Qira'at reciters - fixed apostrophe escaping
    warsh: { id
