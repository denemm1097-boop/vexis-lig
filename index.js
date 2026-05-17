require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, AuditLogEvent,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIG
// ============================================================
const PREFIX = '.';
const ROLES = {
  FUTBOLCU:        '1502440606239035483',
  TEKNIK_DIREKTOR: '1502440639873159210',
  UYE:             '1502440854298562612',
  BAYAN_UYE:       '1502440841925361734',
  DEGER_YETKILISI: '1502437247247581294',
  KAYIT_YETKILISI: '1502437233821483080',
  BOT_COMMANDER:   '1502440977615290530',
  MODERATOR:       '1502437113038110803',
  TAKIM_KAPTANI:   '1502440820031356958',
  OWNER:           '1502436551223935149',
  KAYITSIZ:        '1502453206595276942',
};
const CHANNELS = {
  DEGER_LOG:      '1502434477245202483',
  GUVENLIK_LOG:   '1502434415698247804',
  ANTRENMAN:      '1502434504361644082',
  PENALTI:        '1502434507020697804',
  DEGER_BILDIRIM: '1502434475404169327',
  TRANSFER_LOG:   '1502434510292127845',
  KAYIT_BILDIRIM: '1502434430772445336',
  KAYIT_LOG:      '1502434480927936753',
};
const ROLE_HIERARCHY = [
  ROLES.OWNER, ROLES.BOT_COMMANDER, ROLES.MODERATOR,
  ROLES.DEGER_YETKILISI, ROLES.KAYIT_YETKILISI, ROLES.TAKIM_KAPTANI,
  ROLES.TEKNIK_DIREKTOR, ROLES.FUTBOLCU, ROLES.UYE, ROLES.BAYAN_UYE, ROLES.KAYITSIZ,
];

const BAR = {
  emptyLeft:   '<:PL_bosbarsol:1502450315776229507>',
  emptyMiddle: '<:PL_bosbarorta:1502450207953260575>',
  emptyRight:  '<:PL_bosbarsag:1502450239372656651>',
  fullLeft:    '<a:PL_barsol:1502439844134256641>',
  fullMiddle:  '<a:PL_bar:1502440628288487425>',
  fullRight:   '<a:PL_barsag:1502450166748414092>',
};

// ============================================================
// DATA (JSON — restart-safe)
// ============================================================
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadData(file) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return {};
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return {}; }
}
function saveData(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// ============================================================
// HELPERS
// ============================================================
function getRoleLevel(member) {
  for (let i = 0; i < ROLE_HIERARCHY.length; i++)
    if (member.roles.cache.has(ROLE_HIERARCHY[i])) return i;
  return ROLE_HIERARCHY.length;
}
function isHigherThan(a, b) { return getRoleLevel(a) < getRoleLevel(b); }

function parseDuration(str) {
  const m = str.match(/^(\d+)(d|h|m|s)$/i);
  if (!m) return null;
  const mul = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(m[1]) * mul[m[2].toLowerCase()];
}
function fmtDuration(ms) {
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000),
        m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return [d && `${d} gün`, h && `${h} saat`, m && `${m} dakika`, s && `${s} saniye`]
    .filter(Boolean).join(' ') || '0 saniye';
}

function buildBar(current, total) {
  let bar = '';
  for (let i = 0; i < total; i++) {
    const full = i < current;
    if (i === 0)             bar += full ? BAR.fullLeft   : BAR.emptyLeft;
    else if (i === total - 1) bar += full ? BAR.fullRight  : BAR.emptyRight;
    else                     bar += full ? BAR.fullMiddle : BAR.emptyMiddle;
  }
  return bar;
}

// ============================================================
// CLIENT
// ============================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

client.once('ready', () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
  console.log(`📊 ${client.guilds.cache.size} sunucuda hizmet veriliyor.`);
});

// ============================================================
// SNIPE
// ============================================================
client.on('messageDelete', message => {
  if (!message.author || message.author.bot || !message.content) return;
  const snipes = loadData('snipe.json');
  snipes[message.channel.id] = {
    content: message.content,
    authorId: message.author.id,
    authorTag: message.author.tag,
    deletedAt: Date.now(),
  };
  saveData('snipe.json', snipes);
});

// ============================================================
// GUILD MEMBER ADD
// ============================================================
client.on('guildMemberAdd', async member => {
  const guild = member.guild;
  try { await member.roles.add(ROLES.KAYITSIZ); } catch {}

  // DM hoş geldin
  await member.send({
    embeds: [new EmbedBuilder()
      .setTitle('⚡ Vexis League\'e Hoş Geldin!')
      .setColor(0x5865f2)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setDescription(
        `Merhaba **${member.displayName}**! 👋\n\n` +
        `**Vexis League** sunucusuna hoş geldin!\n\n` +
        `📋 Kayıt yetkililerini bekle, seni en kısa sürede karşılayacaklar.\n` +
        `⚡ Sunucumuzda **${guild.memberCount}.** üye olarak katıldın!`
      )
      .addFields(
        { name: '📌 Sunucu', value: guild.name, inline: true },
        { name: '👥 Toplam Üye', value: `${guild.memberCount}`, inline: true },
      ).setTimestamp()],
  }).catch(() => {});

  const ch = guild.channels.cache.get(CHANNELS.KAYIT_BILDIRIM);
  if (!ch) return;

  const pending = loadData('pendingRegistrations.json');
  pending[member.id] = {
    userId: member.id,
    userTag: member.user.tag,
    joinedAt: Date.now(),
    claimedBy: null,
    claimedAt: null,
    registered: false,
  };
  saveData('pendingRegistrations.json', pending);

  // content alanında ping → embed içi etiket bildirim yapmaz!
  const joinMsg = await ch.send({
    content: `<@&${ROLES.KAYIT_YETKILISI}>`,
    allowedMentions: { roles: [ROLES.KAYIT_YETKILISI] },
    embeds: [new EmbedBuilder()
      .setTitle('🆕 Yeni Üye Katıldı!')
      .setColor(0x00b300)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `**${member}** sunucuya katıldı!\n` +
        `Kaydı üstlenmek için aşağıdaki butona bas.`
      )
      .addFields(
        { name: '👤 Kullanıcı', value: `${member} (${member.user.tag})`, inline: true },
        { name: '📅 Katılım', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
        { name: '👥 Üye Sayısı', value: `${guild.memberCount}`, inline: true },
      ).setTimestamp()],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`kayit_ustlen_${member.id}`)
        .setLabel('📋 Kaydı Üstlen')
        .setStyle(ButtonStyle.Primary),
    )],
  });

  // 10 dakika sonra herkese aç
  setTimeout(async () => {
    const fp = loadData('pendingRegistrations.json');
    if (!fp[member.id] || fp[member.id].registered) return;
    if (fp[member.id].claimedBy) {
      fp[member.id].claimedBy = null;
      fp[member.id].claimedAt = null;
      saveData('pendingRegistrations.json', fp);
      await joinMsg.edit({
        content: `<@&${ROLES.KAYIT_YETKILISI}>`,
        allowedMentions: { roles: [ROLES.KAYIT_YETKILISI] },
        embeds: [new EmbedBuilder()
          .setTitle('⚠️ Kayıt Bekliyor — Herkes Üstlenebilir')
          .setColor(0xffa500)
          .setDescription(
            `**${member}** kullanıcısının kaydı 10 dakika içinde yapılmadı!\n` +
            `Herhangi bir Kayıt Yetkilisi üstlenebilir.`
          )
          .addFields(
            { name: '👤 Kullanıcı', value: `${member} (${member.user.tag})`, inline: true },
          ).setTimestamp()],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`kayit_ustlen_${member.id}`)
            .setLabel('📋 Kaydı Üstlen')
            .setStyle(ButtonStyle.Primary),
        )],
      }).catch(() => {});
    }
  }, 10 * 60 * 1000);
});

// ============================================================
// GÜVENLİK — AUDIT LOG
// ============================================================
client.on('guildAuditLogEntryCreate', async (entry, guild) => {
  if (entry.executor?.bot) return;

  const watched = [
    AuditLogEvent.MemberRoleUpdate,
    AuditLogEvent.MemberUpdate,
    AuditLogEvent.RoleUpdate,
    AuditLogEvent.MemberBanAdd,
    AuditLogEvent.MemberKick,
  ];
  if (!watched.includes(entry.action)) return;

  const executor = await guild.members.fetch(entry.executorId).catch(() => null);
  if (!executor || executor.roles.cache.has(ROLES.OWNER)) return;

  let flagged = false;
  let reason = '';

  if (entry.action === AuditLogEvent.RoleUpdate) {
    const permChange = (entry.changes || []).find(c => c.key === 'permissions');
    if (permChange) { flagged = true; reason = 'Rol iznini (permissions) değiştirdi.'; }
  }

  if (entry.action === AuditLogEvent.MemberRoleUpdate) {
    const added = (entry.changes || []).find(c => c.key === '$add');
    if (added?.new?.length) {
      if (entry.targetId === entry.executorId) {
        flagged = true; reason = 'Kendine rol vermeye çalıştı.';
      } else {
        const target = await guild.members.fetch(entry.targetId).catch(() => null);
        if (target && !isHigherThan(executor, target)) {
          flagged = true; reason = 'Kendinden üst veya eşit birine rol verdi.';
        }
      }
    }
  }

  if (entry.action === AuditLogEvent.MemberUpdate) {
    const nickChange = (entry.changes || []).find(c => c.key === 'nick');
    if (nickChange && entry.executorId !== entry.targetId) {
      const target = await guild.members.fetch(entry.targetId).catch(() => null);
      if (target && !isHigherThan(executor, target)) {
        flagged = true; reason = 'Kendinden üst birinin takma adını değiştirdi.';
      }
    }
  }

  if (entry.action === AuditLogEvent.MemberBanAdd && !executor.roles.cache.has(ROLES.BOT_COMMANDER)) {
    flagged = true; reason = 'Yetkisiz ban attı.';
  }

  if (entry.action === AuditLogEvent.MemberKick && !executor.roles.cache.has(ROLES.BOT_COMMANDER)) {
    flagged = true; reason = 'Yetkisiz kick attı.';
  }

  if (!flagged) return;

  const savedRoles = executor.roles.cache.filter(r => r.id !== guild.id).map(r => r.id);
  const roleSaveData = loadData('savedRoles.json');
  roleSaveData[executor.id] = savedRoles;
  saveData('savedRoles.json', roleSaveData);

  try {
    await executor.roles.remove(
      executor.roles.cache.filter(r => r.id !== guild.id),
      'Güvenlik sistemi — şüpheli işlem'
    );
  } catch {}

  const logCh = guild.channels.cache.get(CHANNELS.GUVENLIK_LOG);
  if (!logCh) return;

  const targetDisplay = entry.targetId ? `<@${entry.targetId}>` : 'Bilinmiyor';
  const embed = new EmbedBuilder()
    .setTitle('🚨 ACİL DURUM — GÜVENLİK ALARMI')
    .setColor(0xff0000)
    .addFields(
      { name: '👤 İşlemi Yapan', value: `${executor} (${executor.user.tag})`, inline: true },
      { name: '🎯 Hedef', value: targetDisplay, inline: true },
      { name: '⚠️ Yapılan İşlem', value: reason },
      { name: '🔴 Bot Aksiyonu', value: 'Kullanıcının tüm rolleri çekildi. Aşağıdan işlem seçin.' },
    ).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`guvenlik_rolleri_geri_${executor.id}`)
      .setLabel('✅ Rolleri Geri Ver')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`guvenlik_ban_${executor.id}`)
      .setLabel('🔨 Ban At')
      .setStyle(ButtonStyle.Danger),
  );

  await logCh.send({
    content: `<@&${ROLES.OWNER}> **ACİL DURUM!**`,
    allowedMentions: { roles: [ROLES.OWNER] },
    embeds: [embed],
    components: [row],
  });
});

// ============================================================
// MESSAGE CREATE
// ============================================================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // AFK kontrol
  const afkData = loadData('afk.json');
  if (afkData[message.author.id]) {
    const info = afkData[message.author.id];
    delete afkData[message.author.id];
    saveData('afk.json', afkData);
    await message.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2)
      .setDescription(`👋 Hoş geldin! **${fmtDuration(Date.now() - info.since)}** süre AFK'daydın.\n**Sebep:** ${info.reason}`)]
    }).catch(() => {});
  }
  if (message.mentions.users.size > 0) {
    for (const [uid, info] of Object.entries(afkData)) {
      if (message.mentions.users.has(uid)) {
        await message.reply({ embeds: [new EmbedBuilder().setColor(0xffa500)
          .setDescription(`💤 <@${uid}> şu an AFK.\n**Sebep:** ${info.reason}\n**Ne zaman:** ${fmtDuration(Date.now() - info.since)} önce`)]
        }).catch(() => {});
      }
    }
  }

  // Selam otomatik yanıt
  const lc = message.content.toLowerCase().trim();
  if (['sa', 's.a', 'selamınaleyküm', 'selam aleyküm', 'selamun aleyküm'].includes(lc)) {
    await message.reply(
      `Ve Aleykümselam Hoşgeldin <a:PL_lop:1502653089688191036>\n` +
      `<#${CHANNELS.ANTRENMAN}> Kanalından Antrenman Yapmayı Unutmayınız`
    ).catch(() => {});
  }

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  // ── YARDIM ──────────────────────────────────────────────
  if (['yardım', 'yardim'].includes(cmd)) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('📖 Vexis League Bot — Komut Listesi')
      .setColor(0x5865f2)
      .addFields(
        { name: '🌍 Herkes Kullanabilir', value: '`.afk [sebep]` · `.kayıtbilgi @kişi` · `.sunucu` · `.snipe` · `.takım <isim>` · `.yardım`' },
        { name: '⚡ @Futbolcu', value: '`.ant` — Antrenman yap (1 saatte 1 kez, sadece antrenman kanalında)\n`.penaltı` — Penaltı at (sadece penaltı kanalında)' },
        { name: '📋 @Kayıt Yetkilisi', value: '`.k @kişi <isim>` — Kişiyi kayıt et\n`.isim @kişi <isim>` — İsim değiştir\n`.kayıtsız @kişi` — Kayıtsız yap\n`.ara <isim>` — Üye ara\n`.şart` — Kayıt şartlarını gönder' },
        { name: '💰 @Değer Yetkilisi', value: '`.ydver @kişi <miktar> <sebep>` — Oyuncuya değer ver' },
        { name: '🔇 @Moderatör', value: '`.mute @kişi <süre> [sebep]` — Sustur (1d/12h/30m)\n`.unmute @kişi` — Susturmayı kaldır' },
        { name: '🛡️ @Bot Commander', value: '`.ban @kişi [sebep]` — Banla\n`.kick @kişi [sebep]` — At\n`.rolver @kişi <rol>` — Rol ver\n`.rolal @kişi <rol>` — Rol al' },
        { name: '📤 @Teknik Direktör / @Takım Kaptanı', value: '`.kap` — Transfer / Sözleşme Uzatma / Fesh' },
        { name: '👑 @Owner', value: '`.takımrolekle <rol adı>` — KAP için takım rolü ekle' },
        { name: '⏱️ Süre Formatı', value: '`d` = Gün · `h` = Saat · `m` = Dakika\nÖrnek: `3d` `12h` `30m`' },
      ).setTimestamp().setFooter({ text: 'Vexis League | Yardım' })]
    });
  }

  // ── SUNUCU ───────────────────────────────────────────────
  if (cmd === 'sunucu') {
    const g = message.guild;
    await g.fetch();
    const owner = await g.fetchOwner().catch(() => null);
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle(`🏟️ ${g.name}`).setColor(0x5865f2).setThumbnail(g.iconURL({ dynamic: true }))
      .addFields(
        { name: '🆔 Sunucu ID', value: g.id, inline: true },
        { name: '👑 Sahip', value: owner ? `${owner}` : '?', inline: true },
        { name: '👥 Üye', value: `${g.memberCount}`, inline: true },
        { name: '🎭 Rol', value: `${g.roles.cache.size - 1}`, inline: true },
        { name: '💬 Kanal', value: `${g.channels.cache.size}`, inline: true },
        { name: '📅 Açılış', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:F>`, inline: true },
        { name: '⚡ Boost', value: `Seviye ${g.premiumTier} (${g.premiumSubscriptionCount} boost)`, inline: true },
      ).setTimestamp().setFooter({ text: 'Vexis League' })]
    });
  }

  // ── SNIPE ────────────────────────────────────────────────
  if (cmd === 'snipe') {
    const snipes = loadData('snipe.json');
    const e = snipes[message.channel.id];
    if (!e) return message.reply('❌ Bu kanalda yakın zamanda silinmiş mesaj yok.');
    return message.reply({ embeds: [new EmbedBuilder().setTitle('🗑️ Silinen Mesaj').setColor(0xff6600)
      .setDescription(e.content || '*[boş mesaj]*')
      .addFields(
        { name: '👤 Gönderen', value: `<@${e.authorId}> (${e.authorTag})`, inline: true },
        { name: '🕐 Silinme', value: `<t:${Math.floor(e.deletedAt / 1000)}:R>`, inline: true },
      ).setTimestamp()]
    });
  }

  // ── AFK ──────────────────────────────────────────────────
  if (cmd === 'afk') {
    const reason = args.join(' ') || 'AFK';
    const afk = loadData('afk.json');
    afk[message.author.id] = { reason, since: Date.now() };
    saveData('afk.json', afk);
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2)
      .setTitle('💤 AFK Modu Aktif')
      .setDescription(`**${message.member.displayName}** AFK moduna geçti.\n**Sebep:** ${reason}`)
      .setTimestamp()]
    });
  }

  // ── KAYIT BİLGİ ──────────────────────────────────────────
  if (['kayıtbilgi', 'kayitbilgi'].includes(cmd)) {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Kullanım: `.kayıtbilgi @kullanıcı`');
    const regs = loadData('registrations.json');
    const entry = regs[target.id];
    if (!entry) return message.reply('❌ Bu kullanıcı için kayıt bilgisi bulunamadı.');
    const reg = await message.guild.members.fetch(entry.registrarId).catch(() => null);
    return message.reply({ embeds: [new EmbedBuilder().setTitle('📋 Kayıt Bilgisi').setColor(0x5865f2)
      .addFields(
        { name: '👤 Kullanıcı', value: `${target}`, inline: true },
        { name: '👮 Kaydeden', value: reg ? `${reg}` : `ID: ${entry.registrarId}`, inline: true },
        { name: '🎭 Verilen Rol', value: entry.roleName || '?', inline: true },
        { name: '📅 Kayıt Tarihi', value: `<t:${Math.floor(entry.registeredAt / 1000)}:F>`, inline: true },
      ).setTimestamp()]
    });
  }

  // ── ARA ──────────────────────────────────────────────────
  if (cmd === 'ara') {
    if (!message.member.roles.cache.has(ROLES.KAYIT_YETKILISI) && !message.member.roles.cache.has(ROLES.OWNER))
      return message.reply('❌ Sadece **Kayıt Yetkilileri** kullanabilir.');
    const query = args.join(' ');
    if (!query) return message.reply('❌ Kullanım: `.ara <isim>`');
    await message.guild.members.fetch();
    const results = message.guild.members.cache.filter(m =>
      m.displayName.toLowerCase().includes(query.toLowerCase()) ||
      m.user.username.toLowerCase().includes(query.toLowerCase())
    );
    if (!results.size) return message.reply(`❌ \`${query}\` için sonuç bulunamadı.`);
    const list = results.first(15).map(m => `• ${m.displayName} (${m.user.tag}) — ${m}`).join('\n');
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle(`🔍 Arama: "${query}"`).setColor(0x5865f2)
      .setDescription(list)
      .setFooter({ text: `${results.size} sonuç${results.size > 15 ? ' (ilk 15)' : ''}` })
      .setTimestamp()]
    });
  }

  // ── ŞART ─────────────────────────────────────────────────
  if (['şart', 'sart'].includes(cmd)) {
    if (!message.member.roles.cache.has(ROLES.KAYIT_YETKILISI) && !message.member.roles.cache.has(ROLES.OWNER))
      return message.reply('❌ Sadece **Kayıt Yetkilileri** kullanabilir.');
    return message.channel.send(
      `*Vexis League Sunucuya Girme Şartları*\n` +
      `Sunucuya kayıt olabilmek için aşağıdaki şartları yerine getirmeniz gerekmektedir:\n\n` +
      `📌 **Gerekli İşlemler**\n` +
      `🎉 <#1502434459352301568> Kanalındaki **Tüm Çekilişlere** Katılmak\n` +
      `🎭 <#1502434445662359733> Kanalından **En Az 2 Rol** Almak\n` +
      `🗳️ <#1502434443963400302> Kanalından **Sunucuya Oy** Vermek\n\n` +
      `⚠️ **Önemli Uyarı**\n` +
      `**Lütfen Kayıt Yetkililerini Kandırmaya Çalışmayın!**`
    );
  }

  // ── İSİM ─────────────────────────────────────────────────
  if (['isim', 'İsim'].includes(cmd)) {
    if (!message.member.roles.cache.has(ROLES.KAYIT_YETKILISI) && !message.member.roles.cache.has(ROLES.OWNER))
      return message.reply('❌ Sadece **Kayıt Yetkilileri** kullanabilir.');
    const target = message.mentions.members.first();
    const yeniIsim = args.slice(1).join(' ');
    if (!target || !yeniIsim)
      return message.reply('❌ Kullanım: `.isim @kullanıcı <yeni isim>`\nÖrnek: `.isim @Eren Yıldız`');
    try {
      await target.setNickname(yeniIsim);
    } catch {
      return message.reply('❌ İsim değiştirilemedi. Yetki sorunu olabilir.');
    }
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('✏️ İsim Değiştirildi').setColor(0x5865f2)
      .addFields(
        { name: '👤 Kullanıcı', value: `${target}`, inline: true },
        { name: '📝 Yeni İsim', value: yeniIsim, inline: true },
        { name: '👮 Yetkili', value: `${message.member}`, inline: true },
      ).setTimestamp()]
    });
  }

  // ── YDVER ────────────────────────────────────────────────
  if (cmd === 'ydver') {
    if (!message.member.roles.cache.has(ROLES.DEGER_YETKILISI))
      return message.reply('❌ Sadece **Değer Yetkilileri** kullanabilir.');
    const target = message.mentions.members.first();
    const amount = parseInt(args[1]);
    const reason = args.slice(2).join(' ');
    if (!target || isNaN(amount) || !reason)
      return message.reply('❌ Kullanım: `.ydver @kullanıcı <miktar> <sebep>`\nÖrnek: `.ydver @Mbappe 3 Görev tamamladı`');
    const nick = target.displayName;
    const match = nick.match(/(\d+(?:\.\d+)?)M€/);
    if (!match) return message.reply('❌ İsimde değer formatı bulunamadı. (örn: `1M€`)');
    const oldVal = parseFloat(match[1]);
    const newVal = oldVal + amount;
    try { await target.setNickname(nick.replace(/(\d+(?:\.\d+)?)M€/, `${newVal}M€`)); }
    catch { return message.reply('❌ Nick değiştirilemedi. Yetki sorunu olabilir.'); }
    const embed = new EmbedBuilder().setTitle('⚡ Değer Güncellendi').setColor(0x00b300)
      .addFields(
        { name: '👤 Oyuncu', value: `${target}`, inline: true },
        { name: '📊 Eski Değer', value: `${oldVal}M€`, inline: true },
        { name: '📈 Yeni Değer', value: `${newVal}M€`, inline: true },
        { name: '➕ Artış', value: `+${amount}M€`, inline: true },
        { name: '📝 Sebep', value: reason, inline: true },
        { name: '👮 Yetkili', value: `${message.member}`, inline: true },
      ).setTimestamp().setFooter({ text: 'Vexis League | Değer Sistemi' });
    await message.reply({ embeds: [embed] });
    const logCh = message.guild.channels.cache.get(CHANNELS.DEGER_LOG);
    if (logCh) await logCh.send({ embeds: [embed] });
    return;
  }

  // ── K (KAYIT) ────────────────────────────────────────────
  // Kullanım: .k @kullanıcı <isim>
  if (cmd === 'k') {
    if (!message.member.roles.cache.has(ROLES.KAYIT_YETKILISI))
      return message.reply('❌ Sadece **Kayıt Yetkilileri** kullanabilir.');
    const target = message.mentions.members.first();
    if (!target)
      return message.reply('❌ Kullanım: `.k @kullanıcı <isim>`\nÖrnek: `.k @Eren Yıldız`');
    const isim = args.slice(1).join(' ');
    if (!isim)
      return message.reply('❌ Kullanım: `.k @kullanıcı <isim>`\nÖrnek: `.k @Eren Yıldız`');
    const isimKey = isim.replace(/ /g, '_');
    return message.reply({
      embeds: [new EmbedBuilder().setTitle('📋 Kayıt Sistemi').setColor(0x5865f2)
        .setDescription(`**${target}** için kayıt türünü seçin.\n**İsim:** ${isim}`)
        .setFooter({ text: 'Sadece bu komutu kullanan yetkili basabilir.' }).setTimestamp()],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`kayit_aye_${target.id}_${message.author.id}_${isimKey}`).setLabel('@Üye').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`kayit_bayan_${target.id}_${message.author.id}_${isimKey}`).setLabel('@Bayan Üye').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`kayit_futbolcu_${target.id}_${message.author.id}_${isimKey}`).setLabel('@Futbolcu').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`kayit_td_${target.id}_${message.author.id}_${isimKey}`).setLabel('@Teknik Direktör').setStyle(ButtonStyle.Secondary),
      )],
    });
  }

  // ── KAYITSIZ ─────────────────────────────────────────────
  if (['kayıtsız', 'kayitsiz'].includes(cmd)) {
    if (!message.member.roles.cache.has(ROLES.KAYIT_YETKILISI) && !message.member.roles.cache.has(ROLES.OWNER))
      return message.reply('❌ Yetersiz yetki.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Kullanım: `.kayıtsız @kullanıcı`');
    try {
      await target.roles.remove(target.roles.cache.filter(r => r.id !== target.guild.id));
      await target.roles.add(ROLES.KAYITSIZ);
      await target.setNickname(null).catch(() => {});
    } catch { return message.reply('❌ İşlem başarısız. Yetki sorunu olabilir.'); }
    return message.reply({ embeds: [new EmbedBuilder().setTitle('🔄 Kayıtsız Yapıldı').setColor(0xff0000)
      .addFields(
        { name: '👤 Kullanıcı', value: `${target}`, inline: true },
        { name: '👮 Yetkili', value: `${message.member}`, inline: true },
      ).setDescription('Tüm rolleri alındı, **Kayıtsız** rolü verildi.').setTimestamp()]
    });
  }

  // ── BAN ──────────────────────────────────────────────────
  if (cmd === 'ban') {
    if (!message.member.roles.cache.has(ROLES.BOT_COMMANDER) && !message.member.roles.cache.has(ROLES.OWNER))
      return message.reply('❌ Sadece **Bot Commander** kullanabilir.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Kullanım: `.ban @kullanıcı [sebep]`');
    if (target.id === message.author.id) return message.reply('❌ Kendine ban atamazsın.');
    if (!isHigherThan(message.member, target)) return message.reply('❌ Kendinden üst/eşit birine işlem yapamazsın.');
    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    return message.reply({
      embeds: [new EmbedBuilder().setTitle('🔨 Ban Onayı').setColor(0xff0000)
        .addFields(
          { name: '👤 Hedef', value: `${target}`, inline: true },
          { name: '📝 Sebep', value: reason, inline: true },
        ).setDescription('Bu işlemi onaylamak istiyor musun?').setTimestamp()],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ban_onayla_${target.id}_${encodeURIComponent(reason)}`).setLabel('✅ Onayla').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('mod_iptal').setLabel('❌ İptal').setStyle(ButtonStyle.Secondary),
      )],
    });
  }

  // ── KICK ─────────────────────────────────────────────────
  if (cmd === 'kick') {
    if (!message.member.roles.cache.has(ROLES.BOT_COMMANDER) && !message.member.roles.cache.has(ROLES.OWNER))
      return message.reply('❌ Sadece **Bot Commander** kullanabilir.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Kullanım: `.kick @kullanıcı [sebep]`');
    if (target.id === message.author.id) return message.reply('❌ Kendini kick edemezsin.');
    if (!isHigherThan(message.member, target)) return message.reply('❌ Kendinden üst/eşit birine işlem yapamazsın.');
    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    return message.reply({
      embeds: [new EmbedBuilder().setTitle('👟 Kick Onayı').setColor(0xff6600)
        .addFields(
          { name: '👤 Hedef', value: `${target}`, inline: true },
          { name: '📝 Sebep', value: reason, inline: true },
        ).setDescription('Bu işlemi onaylamak istiyor musun?').setTimestamp()],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`kick_onayla_${target.id}_${encodeURIComponent(reason)}`).setLabel('✅ Onayla').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('mod_iptal').setLabel('❌ İptal').setStyle(ButtonStyle.Secondary),
      )],
    });
  }

  // ── ROLVER ───────────────────────────────────────────────
  if (cmd === 'rolver') {
    if (!message.member.roles.cache.has(ROLES.BOT_COMMANDER) && !message.member.roles.cache.has(ROLES.OWNER) && !message.member.roles.cache.has(ROLES.MODERATOR))
      return message.reply('❌ Yetersiz yetki.');
    const target = message.mentions.members.first();
    const rName = args.slice(1).join(' ');
    if (!target || !rName) return message.reply('❌ Kullanım: `.rolver @kullanıcı <rol adı>`');
    if (target.id === message.author.id) return message.reply('❌ Kendine rol veremezsin.');
    if (!isHigherThan(message.member, target)) return message.reply('❌ Kendinden üst/eşit birine işlem yapamazsın.');
    const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === rName.toLowerCase());
    if (!role) return message.reply(`❌ \`${rName}\` adında rol bulunamadı.`);
    try { await target.roles.add(role); } catch { return message.reply('❌ Rol verilemedi.'); }
    return message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Rol Verildi').setColor(0x00b300)
      .addFields(
        { name: '👤 Kullanıcı', value: `${target}`, inline: true },
        { name: '🎭 Rol', value: `${role}`, inline: true },
      ).setTimestamp()]
    });
  }

  // ── ROLAL ────────────────────────────────────────────────
  if (cmd === 'rolal') {
    if (!message.member.roles.cache.has(ROLES.BOT_COMMANDER) && !message.member.roles.cache.has(ROLES.OWNER) && !message.member.roles.cache.has(ROLES.MODERATOR))
      return message.reply('❌ Yetersiz yetki.');
    const target = message.mentions.members.first();
    const rName = args.slice(1).join(' ');
    if (!target || !rName) return message.reply('❌ Kullanım: `.rolal @kullanıcı <rol adı>`');
    if (target.id === message.author.id) return message.reply('❌ Kendinden rol alamazsın.');
    if (!isHigherThan(message.member, target)) return message.reply('❌ Kendinden üst/eşit birine işlem yapamazsın.');
    const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === rName.toLowerCase());
    if (!role) return message.reply(`❌ \`${rName}\` adında rol bulunamadı.`);
    try { await target.roles.remove(role); } catch { return message.reply('❌ Rol alınamadı.'); }
    return message.reply({ embeds: [new EmbedBuilder().setTitle('🗑️ Rol Alındı').setColor(0xff0000)
      .addFields(
        { name: '👤 Kullanıcı', value: `${target}`, inline: true },
        { name: '🎭 Alınan Rol', value: `${role}`, inline: true },
      ).setTimestamp()]
    });
  }

  // ── MUTE ─────────────────────────────────────────────────
  if (cmd === 'mute') {
    if (!message.member.roles.cache.has(ROLES.MODERATOR) && !message.member.roles.cache.has(ROLES.OWNER))
      return message.reply('❌ Sadece **Moderatörler** kullanabilir.');
    const target = message.mentions.members.first();
    if (!target || !args[1]) return message.reply('❌ Kullanım: `.mute @kullanıcı <süre> [sebep]`\nÖrnek: `.mute @Eren 1h Kural ihlali`');
    if (target.id === message.author.id) return message.reply('❌ Kendini mute edemezsin.');
    if (!isHigherThan(message.member, target)) return message.reply('❌ Kendinden üst/eşit birine işlem yapamazsın.');
    const ms = parseDuration(args[1]);
    if (!ms) return message.reply('❌ Geçersiz süre formatı. Örnek: `1d` `12h` `30m`');
    if (ms > 28 * 24 * 60 * 60 * 1000) return message.reply('❌ Maksimum 28 gün mute yapılabilir.');
    const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi';
    try { await target.timeout(ms, reason); } catch { return message.reply('❌ Mute yapılamadı. Yetki sorunu olabilir.'); }
    return message.reply({ embeds: [new EmbedBuilder().setTitle('🔇 Mute Edildi').setColor(0xff9900)
      .addFields(
        { name: '👤 Kullanıcı', value: `${target}`, inline: true },
        { name: '⏱️ Süre', value: fmtDuration(ms), inline: true },
        { name: '📝 Sebep', value: reason, inline: true },
        { name: '👮 Yetkili', value: `${message.member}`, inline: true },
      ).setTimestamp()]
    });
  }

  // ── UNMUTE ───────────────────────────────────────────────
  if (cmd === 'unmute') {
    if (!message.member.roles.cache.has(ROLES.MODERATOR) && !message.member.roles.cache.has(ROLES.OWNER))
      return message.reply('❌ Sadece **Moderatörler** kullanabilir.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Kullanım: `.unmute @kullanıcı`');
    if (!isHigherThan(message.member, target)) return message.reply('❌ Kendinden üst/eşit birine işlem yapamazsın.');
    try { await target.timeout(null); } catch { return message.reply('❌ Unmute yapılamadı.'); }
    return message.reply({ embeds: [new EmbedBuilder().setTitle('🔊 Unmute Edildi').setColor(0x00b300)
      .addFields({ name: '👤 Kullanıcı', value: `${target}`, inline: true }).setTimestamp()]
    });
  }

  // ── ANT ──────────────────────────────────────────────────
  if (cmd === 'ant') {
    if (message.channel.id !== CHANNELS.ANTRENMAN)
      return message.reply(`❌ Bu komutu yalnızca <#${CHANNELS.ANTRENMAN}> kanalında kullanabilirsin.`);
    if (!message.member.roles.cache.has(ROLES.FUTBOLCU))
      return message.reply('❌ Sadece **Futbolcular** kullanabilir.');
    const training = loadData('training.json');
    const now = Date.now();
    const uid = message.author.id;
    if (!training[uid]) training[uid] = { count: 0, lastUsed: 0 };
    const ud = training[uid];
    if (ud.lastUsed > 0 && now - ud.lastUsed < 3600000) {
      const mins = Math.ceil((3600000 - (now - ud.lastUsed)) / 60000);
      return message.reply(`⏱️ Antrenman için **${mins} dakika** daha beklemelisin.`);
    }
    if (ud.count >= 10) ud.count = 0;
    ud.count++;
    ud.lastUsed = now;
    saveData('training.json', training);

    const bar = buildBar(ud.count, 10);
    const embed = new EmbedBuilder()
      .setTitle('<a:fast:1503888692987695135> Antrenman')
      .setColor(0x00b300)
      .setDescription(
        `**${message.member.displayName}** antrenman yaptı!\n\n` +
        `**İlerleme:** ${ud.count}/10\n\n` +
        bar
      )
      .setTimestamp()
      .setFooter({ text: 'Vexis League | Antrenman Sistemi' });

    await message.reply({ embeds: [embed] });

    if (ud.count === 10) {
      const notifCh = message.guild.channels.cache.get(CHANNELS.DEGER_BILDIRIM);
      if (notifCh) {
        await notifCh.send({
          content: `<@&${ROLES.DEGER_YETKILISI}>`,
          allowedMentions: { roles: [ROLES.DEGER_YETKILISI] },
          embeds: [new EmbedBuilder()
            .setTitle('🏆 10/10 Antrenman Tamamlandı!')
            .setColor(0xffd700)
            .setDescription(
              `**${message.member}** kullanıcısı **10/10 antrenman** tamamladı!\n` +
              `Değer güncellemesi yapabilirsiniz.`
            ).setTimestamp()],
        });
      }
      ud.count = 0;
      saveData('training.json', training);
    }
    return;
  }

  // ── PENALTİ ──────────────────────────────────────────────
  if (['penaltı', 'penalti'].includes(cmd)) {
    if (message.channel.id !== CHANNELS.PENALTI)
      return message.reply(`❌ Bu komutu yalnızca <#${CHANNELS.PENALTI}> kanalında kullanabilirsin.`);
    if (!message.member.roles.cache.has(ROLES.FUTBOLCU))
      return message.reply('❌ Sadece **Futbolcular** kullanabilir.');

    const steps = [
      '🏃 **Penaltı noktasına yaklaşıyor...**',
      '<a:fast:1503888692987695135> **Koşuya başladı...**',
      '👟 **Şut çekiyor...**',
      '💨 **Top uçuyor...**',
    ];
    const msg = await message.channel.send(steps[0]);
    for (let i = 1; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 1200));
      await msg.edit(steps[i]);
    }
    await new Promise(r => setTimeout(r, 1400));

    const outcomes = [
      { label: '⚽ GOL! Müthiş bir şut!', isGoal: true, w: 15 },
      { label: '❌ Aut! Top dışarı çıktı!', isGoal: false, w: 20 },
      { label: '🏁 Direkten döndü!', isGoal: false, w: 20 },
      { label: '🧤 Kaleci kurtardı!', isGoal: false, w: 25 },
      { label: '🙈 Top tepeye gitti!', isGoal: false, w: 10 },
      { label: '💥 Yan direk!', isGoal: false, w: 10 },
    ];
    const total = outcomes.reduce((s, o) => s + o.w, 0);
    let rand = Math.random() * total;
    let outcome = outcomes[outcomes.length - 1];
    for (const o of outcomes) { rand -= o.w; if (rand <= 0) { outcome = o; break; } }

    await msg.edit({
      content: null,
      embeds: [new EmbedBuilder()
        .setTitle('🥅 Penaltı Sonucu')
        .setColor(outcome.isGoal ? 0xffd700 : 0xff0000)
        .setDescription(
          `**${message.member.displayName}** penaltı attı!\n\n` +
          `**Sonuç:** ${outcome.label}`
        ).setTimestamp()],
    });

    if (outcome.isGoal) {
      const ch = message.guild.channels.cache.get(CHANNELS.DEGER_BILDIRIM);
      if (ch) await ch.send({
        content: `<@&${ROLES.DEGER_YETKILISI}>`,
        allowedMentions: { roles: [ROLES.DEGER_YETKILISI] },
        embeds: [new EmbedBuilder()
          .setTitle('⚽ Penaltı Golü!')
          .setColor(0xffd700)
          .setDescription(
            `**${message.member}** penaltıdan **gol attı!**\n` +
            `Değer güncellemesi yapabilirsiniz.`
          ).setTimestamp()],
      });
    }
    return;
  }

  // ── KAP ──────────────────────────────────────────────────
  if (cmd === 'kap') {
    if (!message.member.roles.cache.has(ROLES.TEKNIK_DIREKTOR) &&
        !message.member.roles.cache.has(ROLES.TAKIM_KAPTANI) &&
        !message.member.roles.cache.has(ROLES.OWNER))
      return message.reply('❌ Sadece **Teknik Direktör** veya **Takım Kaptanı** kullanabilir.');
    return message.reply({
      embeds: [new EmbedBuilder().setTitle('📋 KAP Sistemi').setColor(0x5865f2)
        .setDescription('Yapmak istediğiniz işlemi seçin:')
        .addFields(
          { name: '📤 Transfer', value: 'Oyuncu transferi gerçekleştir', inline: true },
          { name: '📝 Sözleşme Uzatma', value: 'Mevcut sözleşmeyi uzat', inline: true },
          { name: '🚫 Fesh', value: 'Sözleşmeyi feshettir', inline: true },
        ).setTimestamp()],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('kap_transfer').setLabel('📤 Transfer').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('kap_uzatma').setLabel('📝 Sözleşme Uzatma').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('kap_fesh').setLabel('🚫 Fesh').setStyle(ButtonStyle.Danger),
      )],
    });
  }

  // ── TAKIM ROL EKLE ────────────────────────────────────────
  if (['takımrolekle', 'takimrolekle'].includes(cmd)) {
    if (!message.member.roles.cache.has(ROLES.OWNER))
      return message.reply('❌ Sadece **Owner** kullanabilir.');
    const rName = args.join(' ');
    if (!rName) return message.reply('❌ Kullanım: `.takımrolekle <rol adı>`');
    const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === rName.toLowerCase());
    if (!role) return message.reply(`❌ \`${rName}\` adında rol bulunamadı.`);
    const tr = loadData('teamRoles.json');
    if (!tr.roles) tr.roles = [];
    if (tr.roles.includes(role.id)) return message.reply('❌ Bu rol zaten listede.');
    tr.roles.push(role.id);
    saveData('teamRoles.json', tr);
    return message.reply({ embeds: [new EmbedBuilder().setTitle('✅ Takım Rolü Eklendi').setColor(0x00b300)
      .setDescription(`**${role.name}** takım rolleri listesine eklendi.`).setTimestamp()]
    });
  }

  // ── TAKIM ────────────────────────────────────────────────
  if (['takım', 'takim'].includes(cmd)) {
    const tName = args.join(' ');
    if (!tName) return message.reply('❌ Kullanım: `.takım <takım adı>`\nÖrnek: `.takım Arsenal`');
    const role = message.guild.roles.cache.find(r =>
      r.name.toLowerCase().includes(tName.toLowerCase())
    );
    if (!role) return message.reply(`❌ \`${tName}\` için takım rolü bulunamadı.`);
    const members = role.members;
    if (!members.size) return message.reply(`❌ **${role.name}** takımında kimse yok.`);
    const tds = members.filter(m => m.roles.cache.has(ROLES.TEKNIK_DIREKTOR));
    const fbs = members.filter(m => m.roles.cache.has(ROLES.FUTBOLCU));
    const embed = new EmbedBuilder()
      .setTitle(`🏟️ ${role.name}`)
      .setColor(role.color || 0x5865f2)
      .setTimestamp()
      .setFooter({ text: `Toplam: ${members.size} üye` });
    if (tds.size) embed.addFields({ name: `👔 Teknik Direktörler (${tds.size})`, value: tds.map(m => m.displayName).join('\n') });
    if (fbs.size) embed.addFields({ name: `⚡ Futbolcular (${fbs.size})`, value: fbs.map(m => m.displayName).join('\n') });
    return message.reply({ embeds: [embed] });
  }
});

// ============================================================
// INTERACTIONS
// ============================================================
client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) await handleButton(interaction).catch(console.error);
  else if (interaction.isModalSubmit()) await handleModal(interaction).catch(console.error);
});

async function handleButton(interaction) {
  const { customId, member, guild } = interaction;

  // ── GÜVENLİK: ROLLERİ GERİ VER ─────────────────────────
  if (customId.startsWith('guvenlik_rolleri_geri_')) {
    if (!member.roles.cache.has(ROLES.OWNER))
      return interaction.reply({ content: '❌ Sadece **Owner** kullanabilir.', ephemeral: true });
    const targetId = customId.replace('guvenlik_rolleri_geri_', '');
    const target = await guild.members.fetch(targetId).catch(() => null);
    if (!target) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });
    const saved = loadData('savedRoles.json');
    const roleIds = saved[targetId] || [];
    for (const rid of roleIds) {
      const r = guild.roles.cache.get(rid);
      if (r) await target.roles.add(r).catch(() => {});
    }
    return interaction.update({
      embeds: [new EmbedBuilder().setTitle('✅ Roller Geri Verildi').setColor(0x00b300)
        .setDescription(`**${target.displayName}** kullanıcısının rolleri geri verildi.`).setTimestamp()],
      components: [],
    });
  }

  // ── GÜVENLİK: BAN ────────────────────────────────────────
  if (customId.startsWith('guvenlik_ban_')) {
    if (!member.roles.cache.has(ROLES.OWNER))
      return interaction.reply({ content: '❌ Sadece **Owner** kullanabilir.', ephemeral: true });
    const targetId = customId.replace('guvenlik_ban_', '');
    const target = await guild.members.fetch(targetId).catch(() => null);
    if (!target) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });
    try { await target.ban({ reason: 'Güvenlik sistemi — Owner kararı' }); } catch {
      return interaction.reply({ content: '❌ Ban atılamadı.', ephemeral: true });
    }
    return interaction.update({
      embeds: [new EmbedBuilder().setTitle('🔨 Güvenlik Banı Uygulandı').setColor(0xff0000)
        .setDescription(`**${target.user.tag}** güvenlik ihlali nedeniyle banlandı.`).setTimestamp()],
      components: [],
    });
  }

  // ── KAYIT ÜSTLEN ─────────────────────────────────────────
  if (customId.startsWith('kayit_ustlen_')) {
    if (!member.roles.cache.has(ROLES.KAYIT_YETKILISI))
      return interaction.reply({ content: '❌ Sadece **Kayıt Yetkilileri** basabilir.', ephemeral: true });
    const userId = customId.replace('kayit_ustlen_', '');
    const pending = loadData('pendingRegistrations.json');
    const entry = pending[userId];
    if (!entry) return interaction.reply({ content: '❌ Bu kayıt artık geçerli değil.', ephemeral: true });
    if (entry.claimedBy) {
      return interaction.reply({ content: `❌ Bu kayıt zaten <@${entry.claimedBy}> tarafından üstlenildi.`, ephemeral: true });
    }
    entry.claimedBy = member.id;
    entry.claimedAt = Date.now();
    saveData('pendingRegistrations.json', pending);

    setTimeout(() => {
      const fp = loadData('pendingRegistrations.json');
      if (fp[userId] && fp[userId].claimedBy === member.id && !fp[userId].registered) {
        fp[userId].claimedBy = null;
        fp[userId].claimedAt = null;
        saveData('pendingRegistrations.json', fp);
        member.send('⚠️ Üstlendiğin kullanıcının kaydını 10 dakika içinde yapmadığın için kayıt tüm yetkililere açıldı.').catch(() => {});
      }
    }, 10 * 60 * 1000);

    return interaction.update({
      content: null,
      embeds: [new EmbedBuilder().setTitle('✅ Kayıt Üstlenildi').setColor(0x00b300)
        .setDescription(
          `<@${userId}> kullanıcısını **${member.displayName}** üstlendi.\n\n` +
          `Kaydı yapmak için: \`.k @kullanıcı <isim>\`\n` +
          `10 dakika içinde yapılmazsa kayıt tüm yetkililere açılır.`
        ).setTimestamp()],
      components: [],
    });
  }

  // ── KAYIT ROL VER ─────────────────────────────────────────
  // customId: kayit_<tip>_<targetId>_<authorId>_<isimKey>
  const kayitMatch = customId.match(/^kayit_(aye|bayan|futbolcu|td)_(\d+)_(\d+)_(.+)$/);
  if (kayitMatch) {
    const [, type, targetId, authorId, isimRaw] = kayitMatch;
    if (member.id !== authorId)
      return interaction.reply({ content: '❌ Bu butonlara sadece komutu kullanan yetkili basabilir.', ephemeral: true });
    const isim = isimRaw.replace(/_/g, ' ');
    const target = await guild.members.fetch(targetId).catch(() => null);
    if (!target) return interaction.reply({ content: '❌ Kullanıcı sunucuda bulunamadı.', ephemeral: true });
    const roleMap = {
      aye:      { id: ROLES.UYE,             name: 'Üye' },
      bayan:    { id: ROLES.BAYAN_UYE,       name: 'Bayan Üye' },
      futbolcu: { id: ROLES.FUTBOLCU,        name: 'Futbolcu' },
      td:       { id: ROLES.TEKNIK_DIREKTOR, name: 'Teknik Direktör' },
    };
    const roleInfo = roleMap[type];
    try {
      await target.roles.remove(ROLES.KAYITSIZ).catch(() => {});
      await target.roles.add(roleInfo.id);
      await target.setNickname(isim).catch(() => {});
    } catch { return interaction.reply({ content: '❌ Roller verilirken hata oluştu.', ephemeral: true }); }

    const regs = loadData('registrations.json');
    regs[target.id] = { registrarId: member.id, roleName: roleInfo.name, registeredAt: Date.now() };
    saveData('registrations.json', regs);

    // Pending kaydı temizle (varsa)
    const pending = loadData('pendingRegistrations.json');
    if (pending[targetId]) {
      pending[targetId].registered = true;
      saveData('pendingRegistrations.json', pending);
    }

    const embed = new EmbedBuilder().setTitle('✅ Kayıt Tamamlandı').setColor(0x00b300)
      .addFields(
        { name: '👤 Kullanıcı', value: `${target}`, inline: true },
        { name: '📝 İsim', value: isim, inline: true },
        { name: '🎭 Rol', value: roleInfo.name, inline: true },
        { name: '👮 Kaydeden', value: `${member}`, inline: true },
      ).setTimestamp();
    await interaction.update({ embeds: [embed], components: [] });
    const logCh = guild.channels.cache.get(CHANNELS.KAYIT_LOG);
    if (logCh) await logCh.send({ embeds: [new EmbedBuilder().setTitle('📋 Yeni Kayıt').setColor(0x00b300)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`**${target.displayName}** aramıza katıldı! Hoş geldin! 🎉`)
      .addFields(
        { name: '👤 Kullanıcı', value: `${target}`, inline: true },
        { name: '📝 İsim', value: isim, inline: true },
        { name: '🎭 Rol', value: roleInfo.name, inline: true },
        { name: '👮 Kaydeden', value: `${member}`, inline: true },
        { name: '👥 Sunucu Üye Sayısı', value: `${guild.memberCount}`, inline: true },
      ).setTimestamp()]
    });
    return;
  }

  // ── BAN ONAYLA ────────────────────────────────────────────
  if (customId.startsWith('ban_onayla_')) {
    if (!member.roles.cache.has(ROLES.BOT_COMMANDER) && !member.roles.cache.has(ROLES.OWNER))
      return interaction.reply({ content: '❌ Yetersiz yetki.', ephemeral: true });
    const parts = customId.split('_');
    const targetId = parts[2];
    const reason = decodeURIComponent(parts.slice(3).join('_'));
    const target = await guild.members.fetch(targetId).catch(() => null);
    if (!target) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });
    try { await target.ban({ reason }); } catch { return interaction.reply({ content: '❌ Ban atılamadı.', ephemeral: true }); }
    return interaction.update({
      embeds: [new EmbedBuilder().setTitle('🔨 Kullanıcı Banlandı').setColor(0xff0000)
        .addFields(
          { name: '👤 Kullanıcı', value: target.user.tag, inline: true },
          { name: '📝 Sebep', value: reason, inline: true },
        ).setTimestamp()],
      components: [],
    });
  }

  // ── KICK ONAYLA ───────────────────────────────────────────
  if (customId.startsWith('kick_onayla_')) {
    if (!member.roles.cache.has(ROLES.BOT_COMMANDER) && !member.roles.cache.has(ROLES.OWNER))
      return interaction.reply({ content: '❌ Yetersiz yetki.', ephemeral: true });
    const parts = customId.split('_');
    const targetId = parts[2];
    const reason = decodeURIComponent(parts.slice(3).join('_'));
    const target = await guild.members.fetch(targetId).catch(() => null);
    if (!target) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });
    try { await target.kick(reason); } catch { return interaction.reply({ content: '❌ Kick atılamadı.', ephemeral: true }); }
    return interaction.update({
      embeds: [new EmbedBuilder().setTitle('👟 Kullanıcı Atıldı').setColor(0xff6600)
        .addFields(
          { name: '👤 Kullanıcı', value: target.user.tag, inline: true },
          { name: '📝 Sebep', value: reason, inline: true },
        ).setTimestamp()],
      components: [],
    });
  }

  // ── MOD İPTAL ─────────────────────────────────────────────
  if (customId === 'mod_iptal')
    return interaction.update({ embeds: [new EmbedBuilder().setColor(0x808080).setDescription('❌ İşlem iptal edildi.')], components: [] });

  // ── KAP BUTONLARI ─────────────────────────────────────────
  if (customId === 'kap_transfer') {
    if (!member.roles.cache.has(ROLES.TEKNIK_DIREKTOR) && !member.roles.cache.has(ROLES.TAKIM_KAPTANI) && !member.roles.cache.has(ROLES.OWNER))
      return interaction.reply({ content: '❌ Yetersiz yetki.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId('kap_modal_transfer').setTitle('📤 Transfer Formu');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('oyuncu_ismi').setLabel('Oyuncu İsmi').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eski_takim').setLabel('Eski Takımı').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('yeni_takim').setLabel('Yeni Takımı').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('maas').setLabel('Aldığı Maaş').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sezon_ek').setLabel('Kaç Sezon / Ek Madde / Fesh Bedeli').setStyle(TextInputStyle.Paragraph).setRequired(true)),
    );
    return interaction.showModal(modal);
  }

  if (customId === 'kap_uzatma') {
    if (!member.roles.cache.has(ROLES.TEKNIK_DIREKTOR) && !member.roles.cache.has(ROLES.TAKIM_KAPTANI) && !member.roles.cache.has(ROLES.OWNER))
      return interaction.reply({ content: '❌ Yetersiz yetki.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId('kap_modal_uzatma').setTitle('📝 Sözleşme Uzatma');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('oyuncu_ismi').setLabel('Oyuncu İsmi').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('takim').setLabel('Takımı').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('maas').setLabel('Aldığı Maaş').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sezon_ek').setLabel('Kaç Sezon / Ek Madde').setStyle(TextInputStyle.Paragraph).setRequired(true)),
    );
    return interaction.showModal(modal);
  }

  if (customId === 'kap_fesh') {
    if (!member.roles.cache.has(ROLES.TEKNIK_DIREKTOR) && !member.roles.cache.has(ROLES.TAKIM_KAPTANI) && !member.roles.cache.has(ROLES.OWNER))
      return interaction.reply({ content: '❌ Yetersiz yetki.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId('kap_modal_fesh').setTitle('🚫 Fesh Formu');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('oyuncu_ismi').setLabel('Oyuncu İsmi').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('eski_takim').setLabel('Eski Takımı').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('fesh_sebebi').setLabel('Fesh Sebebi').setStyle(TextInputStyle.Paragraph).setRequired(true)),
    );
    return interaction.showModal(modal);
  }
}

async function handleModal(interaction) {
  const { customId, member, guild } = interaction;

  if (customId === 'kap_modal_transfer') {
    const oyuncu  = interaction.fields.getTextInputValue('oyuncu_ismi');
    const eskiTak = interaction.fields.getTextInputValue('eski_takim');
    const yeniTak = interaction.fields.getTextInputValue('yeni_takim');
    const maas    = interaction.fields.getTextInputValue('maas');
    const sezon   = interaction.fields.getTextInputValue('sezon_ek');
    const tr = loadData('teamRoles.json');
    const allowed = tr.roles || [];
    let assignedRole = null;
    if (allowed.length) {
      const nr = guild.roles.cache.find(r => allowed.includes(r.id) && r.name.toLowerCase().includes(yeniTak.toLowerCase()));
      if (nr) {
        await guild.members.fetch();
        const om = guild.members.cache.find(m => m.displayName.toLowerCase().includes(oyuncu.toLowerCase().split('|')[0].trim()));
        if (om) {
          const or2 = guild.roles.cache.find(r => allowed.includes(r.id) && om.roles.cache.has(r.id));
          if (or2) await om.roles.remove(or2).catch(() => {});
          await om.roles.add(nr).catch(() => {});
          assignedRole = nr.name;
        }
      }
    }
    const embed = new EmbedBuilder().setTitle('📤 Transfer Haberi').setColor(0x00b300)
      .addFields(
        { name: '👤 Oyuncu', value: oyuncu, inline: true },
        { name: '🏟️ Eski Takım', value: eskiTak, inline: true },
        { name: '🏟️ Yeni Takım', value: yeniTak, inline: true },
        { name: '💰 Maaş', value: maas, inline: true },
        { name: '📋 Sezon/Ek Madde/Fesh', value: sezon },
        { name: '👮 Yetkili', value: `${member}`, inline: true },
      ).setTimestamp().setFooter({ text: 'Vexis League | KAP' });
    if (assignedRole) embed.addFields({ name: '✅ Verilen Takım Rolü', value: assignedRole, inline: true });
    await interaction.reply({ embeds: [embed] });
    const lc = guild.channels.cache.get(CHANNELS.TRANSFER_LOG);
    if (lc) await lc.send({ embeds: [embed] });
    return;
  }

  if (customId === 'kap_modal_uzatma') {
    const oyuncu = interaction.fields.getTextInputValue('oyuncu_ismi');
    const takim  = interaction.fields.getTextInputValue('takim');
    const maas   = interaction.fields.getTextInputValue('maas');
    const sezon  = interaction.fields.getTextInputValue('sezon_ek');
    const embed = new EmbedBuilder().setTitle('📝 Sözleşme Uzatma').setColor(0x5865f2)
      .addFields(
        { name: '👤 Oyuncu', value: oyuncu, inline: true },
        { name: '🏟️ Takım', value: takim, inline: true },
        { name: '💰 Maaş', value: maas, inline: true },
        { name: '📋 Sezon/Ek Madde', value: sezon },
        { name: '👮 Yetkili', value: `${member}`, inline: true },
      ).setTimestamp().setFooter({ text: 'Vexis League | KAP' });
    await interaction.reply({ embeds: [embed] });
    const lc = guild.channels.cache.get(CHANNELS.TRANSFER_LOG);
    if (lc) await lc.send({ embeds: [embed] });
    return;
  }

  if (customId === 'kap_modal_fesh') {
    const oyuncu  = interaction.fields.getTextInputValue('oyuncu_ismi');
    const eskiTak = interaction.fields.getTextInputValue('eski_takim');
    const sebep   = interaction.fields.getTextInputValue('fesh_sebebi');
    const embed = new EmbedBuilder().setTitle('🚫 Fesh Haberi').setColor(0xff0000)
      .addFields(
        { name: '👤 Oyuncu', value: oyuncu, inline: true },
        { name: '🏟️ Eski Takım', value: eskiTak, inline: true },
        { name: '📝 Fesh Sebebi', value: sebep },
        { name: '👮 Yetkili', value: `${member}`, inline: true },
      ).setTimestamp().setFooter({ text: 'Vexis League | KAP' });
    await interaction.reply({ embeds: [embed] });
    const lc = guild.channels.cache.get(CHANNELS.TRANSFER_LOG);
    if (lc) await lc.send({ embeds: [embed] });
    return;
  }
}

// ============================================================
// LOGIN
// ============================================================
client.on('error', e => console.error('[Hata]', e));
process.on('unhandledRejection', e => console.error('[Unhandled]', e));

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN bulunamadı! .env dosyasını kontrol edin.');
  process.exit(1);
}
client.login(process.env.DISCORD_TOKEN);
