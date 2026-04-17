// ======================
// BOT DE GESTIÓN ALBACETE RP - VERSIÓN FINAL COMPLETA Y LIMPIA
// ======================

require('dotenv').config();

// ======================
// SERVIDOR HTTP PARA RENDER
// ======================
const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.send('✅ Bot de Discord Albacete RP está vivo y funcionando en Render');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP corriendo en puerto ${PORT}`);
});

// ======================
// IMPORTS DE DISCORD.JS
// ======================
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionsBitField,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages
  ]
});

// ======================
// CONFIGURACIÓN
// ======================
const DNI_CHANNEL_ID = '1466563810784444478';
const CARNET_CHANNEL_ID = '1457570708497371332';
const LICENCIA_CHANNEL_ID = '1493631768169939136';

const POLICE_ROLES = [
  '1457537988132343858',
  '1457538324578439396',
  '1467525875007230055'
];

// ======================
// ARCHIVOS DE DATOS
// ======================
const SANCTIONS_FILE = path.join(__dirname, 'sanciones.json');
const IDENTIDADES_FILE = path.join(__dirname, 'identidades.json');
const SUBASTAS_FILE = path.join(__dirname, 'subastas.json');

let sanciones = {};
let identidades = {};
let subastasActivas = {};

// ======================
// CARGAR Y GUARDAR
// ======================
function cargarSanciones() {
  if (fs.existsSync(SANCTIONS_FILE)) {
    try {
      sanciones = JSON.parse(fs.readFileSync(SANCTIONS_FILE, 'utf-8'));
      console.log('✅ Sanciones cargadas correctamente.');
    } catch (error) {
      console.error('❌ Error al cargar sanciones:', error.message);
      sanciones = {};
    }
  } else {
    sanciones = {};
    fs.writeFileSync(SANCTIONS_FILE, JSON.stringify({}, null, 4));
    console.log('ℹ️ Archivo sanciones.json creado.');
  }
}

function guardarSanciones() {
  try {
    fs.writeFileSync(SANCTIONS_FILE, JSON.stringify(sanciones, null, 4), 'utf-8');
  } catch (error) {
    console.error('❌ Error al guardar sanciones:', error.message);
  }
}

function cargarIdentidades() {
  if (fs.existsSync(IDENTIDADES_FILE)) {
    try {
      identidades = JSON.parse(fs.readFileSync(IDENTIDADES_FILE, 'utf-8'));
      console.log('✅ Identidades cargadas correctamente.');
    } catch (error) {
      console.error('❌ Error al cargar identidades:', error.message);
      identidades = {};
    }
  } else {
    identidades = {};
    fs.writeFileSync(IDENTIDADES_FILE, JSON.stringify({}, null, 4));
    console.log('ℹ️ Archivo identidades.json creado.');
  }
}

function guardarIdentidades() {
  try {
    fs.writeFileSync(IDENTIDADES_FILE, JSON.stringify(identidades, null, 4), 'utf-8');
  } catch (error) {
    console.error('❌ Error al guardar identidades:', error.message);
  }
}

function getUserData(guildId, userId) {
  if (!identidades[guildId]) identidades[guildId] = {};
  if (!identidades[guildId][userId]) {
    identidades[guildId][userId] = {
      pjs: {
        "1": { dni: null, carnetConducir: null, licenciaArmas: null },
        "2": { dni: null, carnetConducir: null, licenciaArmas: null }
      },
      dinero: 6000,
      lastSalary: null
    };
  }
  return identidades[guildId][userId];
}

// ======================
// EVENTO READY
// ======================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  cargarSanciones();
  cargarIdentidades();

  const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Ver latencia del bot'),
    new SlashCommandBuilder().setName('votacion').setDescription('Crea votación de apertura de servidor (30 minutos)'),
    new SlashCommandBuilder().setName('abrirserver').setDescription('Abre el servidor manualmente'),
    new SlashCommandBuilder().setName('cerrarserver').setDescription('Cierra el servidor'),
    new SlashCommandBuilder().setName('cancelarvotacion').setDescription('Cancela la votación activa en este canal'),
    new SlashCommandBuilder().setName('panel-dni').setDescription('Crea el panel oficial del sistema de DNI'),

    // Sanciones y Multas
    new SlashCommandBuilder().setName('sancionar').setDescription('Registra una sanción').addUserOption(opt => opt.setName('usuario').setRequired(true)).addStringOption(opt => opt.setName('gravedad').setRequired(true).addChoices({ name: '⚠️ Aviso', value: 'aviso' }, { name: '📝 Falta Leve', value: 'leve' }, { name: '⚠️ Falta Moderada', value: 'moderada' }, { name: '🚨 Falta Grave', value: 'grave' })).addStringOption(opt => opt.setName('razon')),
    new SlashCommandBuilder().setName('sanciones').setDescription('Ver todas las sanciones del servidor'),
    new SlashCommandBuilder().setName('sanciones_usuario').setDescription('Ver sanciones de un usuario').addUserOption(opt => opt.setName('usuario').setRequired(true)),
    new SlashCommandBuilder().setName('eliminarsancion').setDescription('Eliminar una sanción por ID').addIntegerOption(opt => opt.setName('id').setRequired(true)),
    new SlashCommandBuilder().setName('multa').setDescription('💰 Registra una multa').addUserOption(opt => opt.setName('usuario').setRequired(true)).addIntegerOption(opt => opt.setName('cantidad').setRequired(true)).addStringOption(opt => opt.setName('razon').setRequired(true)),

    // Comandos Admin DNI
    new SlashCommandBuilder().setName('borrar-dni-admin').setDescription('🔧 [ADMIN] Borra el DNI y documentos').addUserOption(opt => opt.setName('usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    new SlashCommandBuilder().setName('ver-dni-admin').setDescription('🔧 [ADMIN] Ver DNI').addUserOption(opt => opt.setName('usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),

    // Comandos Policía
    new SlashCommandBuilder().setName('buscar-dni').setDescription('🔍 Busca DNI (Policía)').addUserOption(opt => opt.setName('usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    new SlashCommandBuilder().setName('ver-dni').setDescription('🔍 Ver DNI público').addUserOption(opt => opt.setName('usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    new SlashCommandBuilder().setName('licencia-suspender').setDescription('🚔 [POLICÍA] Suspender licencia').addUserOption(opt => opt.setName('usuario').setRequired(true)).addStringOption(opt => opt.setName('tipo').setRequired(true).addChoices({ name: '🚗 Carnet', value: 'carnet' }, { name: '🔫 Licencia Armas', value: 'licencia' })).addIntegerOption(opt => opt.setName('dias').setRequired(true)),

    // NUEVOS COMANDOS
    new SlashCommandBuilder().setName('prestamo').setDescription('💰 Solicitar préstamo').addIntegerOption(opt => opt.setName('cantidad').setRequired(true)).addStringOption(opt => opt.setName('razon').setRequired(true)),
    new SlashCommandBuilder().setName('prestamo-aprobar').setDescription('🔧 [ADMIN] Aprobar préstamo').addStringOption(opt => opt.setName('id').setDescription('ID del préstamo').setRequired(true)),
    new SlashCommandBuilder().setName('prestamo-rechazar').setDescription('🔧 [ADMIN] Rechazar préstamo').addStringOption(opt => opt.setName('id').setDescription('ID del préstamo').setRequired(true)),

    new SlashCommandBuilder().setName('subasta').setDescription('📢 Crear subasta').addStringOption(opt => opt.setName('item').setRequired(true)).addIntegerOption(opt => opt.setName('precio_inicial').setRequired(true)).addIntegerOption(opt => opt.setName('duracion_horas').setRequired(true)),
    new SlashCommandBuilder().setName('pujar').setDescription('📈 Pujar en una subasta').addStringOption(opt => opt.setName('id').setDescription('ID de la subasta').setRequired(true)).addIntegerOption(opt => opt.setName('cantidad').setRequired(true)),

    new SlashCommandBuilder().setName('ruleta').setDescription('🎰 Jugar a la ruleta').addIntegerOption(opt => opt.setName('cantidad').setRequired(true)).addStringOption(opt => opt.setName('color').setRequired(true).addChoices({ name: '🔴 Rojo', value: 'rojo' }, { name: '⚫ Negro', value: 'negro' }, { name: '🟢 Verde', value: 'verde' })),
    new SlashCommandBuilder().setName('loteria').setDescription('🎟️ Comprar boletos de lotería').addIntegerOption(opt => opt.setName('cantidad').setRequired(true))
  ];

  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.commands.set(commands);
      console.log(`✅ Comandos registrados en: ${guild.name}`);
    } catch (err) {
      console.error(`❌ Error al registrar comandos en ${guild.name}:`, err);
    }
  }
});

// ======================
// INTERACCIONES
// ======================
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case 'ping': await interaction.reply({ content: `🏓 Pong! Latencia: **${client.ws.ping}ms**`, flags: MessageFlags.Ephemeral }); break;
        case 'votacion': await handleVotacion(interaction); break;
        case 'abrirserver': await handleAbrirServer(interaction); break;
        case 'cerrarserver': await handleCerrarServer(interaction); break;
        case 'cancelarvotacion': await handleCancelarVotacion(interaction); break;
        case 'panel-dni': await handlePanelDni(interaction); break;
        case 'sancionar': await handleSancionar(interaction); break;
        case 'sanciones': await handleVerSanciones(interaction); break;
        case 'sanciones_usuario': await handleVerSancionesUsuario(interaction); break;
        case 'eliminarsancion': await handleEliminarSancion(interaction); break;
        case 'multa': await handleMulta(interaction); break;
        case 'borrar-dni-admin': await handleBorrarDniAdmin(interaction); break;
        case 'ver-dni-admin': await handleVerDniAdmin(interaction); break;
        case 'buscar-dni': await handleBuscarDni(interaction); break;
        case 'ver-dni': await handleVerDniPublico(interaction); break;
        case 'licencia-suspender': await handleSuspenderLicencia(interaction); break;
        case 'prestamo': await handlePrestamo(interaction); break;
        case 'prestamo-aprobar': await handleAprobarPrestamo(interaction); break;
        case 'prestamo-rechazar': await handleRechazarPrestamo(interaction); break;
        case 'subasta': await handleCrearSubasta(interaction); break;
        case 'pujar': await handlePujarSubasta(interaction); break;
        case 'ruleta': await handleRuleta(interaction); break;
        case 'loteria': await handleLoteria(interaction); break;
      }
      return;
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId.startsWith('dni-') || customId.startsWith('carnet-') || customId.startsWith('licencia-')) {
        await handleDniButton(interaction);
      } else {
        await handleButtonVote(interaction);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
      return;
    }
  } catch (error) {
    console.error('❌ Error global en InteractionCreate:', error);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ content: '❌ Ocurrió un error inesperado.', flags: MessageFlags.Ephemeral });
      } catch {}
    }
  }
});

// ======================
// COMANDOS ADMIN Y POLICÍA
// ======================
async function handleBorrarDniAdmin(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }

  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');

  const userData = getUserData(interaction.guild.id, target.id);

  if (!userData.pjs[pj].dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  userData.pjs[pj].dni = null;
  userData.pjs[pj].carnetConducir = null;
  userData.pjs[pj].licenciaArmas = null;
  guardarIdentidades();

  await interaction.reply(`✅ **DNI y todos los documentos del PJ${pj} de ${target} han sido eliminados.**`);
}

async function handleVerDniAdmin(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }

  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');

  const userData = getUserData(interaction.guild.id, target.id);
  const dni = userData.pjs[pj].dni;

  if (!dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔎 DNI de ${target.user.tag} - PJ${pj}`)
    .setColor(0x00AAFF)
    .addFields(
      { name: 'DNI', value: dni.numero, inline: true },
      { name: 'Nombre Completo', value: `${dni.nombre} ${dni.apellido}`, inline: true },
      { name: 'Fecha Nacimiento', value: dni.fechaNac, inline: true },
      { name: 'Nacionalidad', value: dni.nacionalidad, inline: true },
      { name: 'Género', value: dni.genero, inline: true },
      { name: 'Creado', value: dni.fechaCreacion, inline: true }
    )
    .setThumbnail(target.user.displayAvatarURL());

  await interaction.reply({ embeds: [embed] });
}

async function handleBuscarDni(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) {
    return interaction.reply({ content: '❌ Solo Policía y Staff pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }

  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');

  const userData = getUserData(interaction.guild.id, target.id);
  const dni = userData.pjs[pj].dni;

  if (!dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI registrado en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 DNI ENCONTRADO - PJ${pj}`)
    .setColor(0x00AAFF)
    .setThumbnail(target.user.displayAvatarURL())
    .addFields(
      { name: '👤 Usuario', value: `${target} (\`${target.id}\`)`, inline: false },
      { name: '🪪 DNI', value: dni.numero, inline: true },
      { name: 'Nombre Completo', value: `${dni.nombre} ${dni.apellido}`, inline: true },
      { name: 'Fecha Nacimiento', value: dni.fechaNac, inline: true },
      { name: 'Nacionalidad', value: dni.nacionalidad, inline: true },
      { name: 'Género', value: dni.genero, inline: true },
      { name: 'Creado', value: dni.fechaCreacion, inline: true }
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleVerDniPublico(interaction) {
  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');

  const userData = getUserData(interaction.guild.id, target.id);
  const dni = userData.pjs[pj].dni;

  if (!dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 DNI DE ${target.user.tag} - PJ${pj}`)
    .setColor(0x00AAFF)
    .setThumbnail(target.user.displayAvatarURL())
    .addFields(
      { name: '🪪 DNI', value: dni.numero, inline: true },
      { name: 'Nombre Completo', value: `${dni.nombre} ${dni.apellido}`, inline: true },
      { name: 'Fecha Nacimiento', value: dni.fechaNac, inline: true },
      { name: 'Nacionalidad', value: dni.nacionalidad, inline: true },
      { name: 'Género', value: dni.genero, inline: true },
      { name: 'Creado', value: dni.fechaCreacion, inline: true }
    );

  await interaction.reply({ embeds: [embed] });
}

// ======================
// PRESTAMO - SOLICITUD, APROBAR Y RECHAZAR
// ======================
const prestamosPendientes = new Map(); // id -> datos del préstamo

async function handlePrestamo(interaction) {
  const cantidad = interaction.options.getInteger('cantidad');
  const razon = interaction.options.getString('razon');

  if (cantidad < 500 || cantidad > 15000) {
    return interaction.reply({ content: '❌ La cantidad debe estar entre $500 y $15.000.', flags: MessageFlags.Ephemeral });
  }

  const prestamoId = Date.now().toString();

  const embed = new EmbedBuilder()
    .setTitle('💰 NUEVA SOLICITUD DE PRÉSTAMO')
    .setColor(0x00AAFF)
    .addFields(
      { name: 'Solicitante', value: interaction.user.toString(), inline: false },
      { name: 'Cantidad', value: `**$${cantidad.toLocaleString('es-ES')}**`, inline: true },
      { name: 'Razón', value: razon, inline: false },
      { name: 'ID del préstamo', value: `\`${prestamoId}\``, inline: false }
    )
    .setFooter({ text: 'Usa /prestamo-aprobar o /prestamo-rechazar' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], content: '@everyone' });

  prestamosPendientes.set(prestamoId, {
    id: prestamoId,
    userId: interaction.user.id,
    username: interaction.user.tag,
    cantidad: cantidad,
    razon: razon,
    channel: interaction.channel
  });
}

async function handleAprobarPrestamo(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden aprobar préstamos.', flags: MessageFlags.Ephemeral });
  }

  const prestamoId = interaction.options.getString('id');
  const prestamo = prestamosPendientes.get(prestamoId);

  if (!prestamo) {
    return interaction.reply({ content: '❌ No se encontró ese préstamo o ya fue procesado.', flags: MessageFlags.Ephemeral });
  }

  const userData = getUserData(interaction.guild.id, prestamo.userId);
  userData.dinero += prestamo.cantidad;
  guardarIdentidades();

  const embedAprobado = new EmbedBuilder()
    .setTitle('✅ PRÉSTAMO APROBADO')
    .setColor(0x00FF00)
    .addFields(
      { name: 'Usuario', value: `<@${prestamo.userId}>`, inline: false },
      { name: 'Cantidad', value: `**$${prestamo.cantidad.toLocaleString('es-ES')}**`, inline: true }
    );

  await prestamo.channel.send({ embeds: [embedAprobado] });
  await interaction.reply({ content: `✅ Préstamo ID \`${prestamoId}\` aprobado y dinero entregado.`, flags: MessageFlags.Ephemeral });

  prestamosPendientes.delete(prestamoId);
}

async function handleRechazarPrestamo(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden rechazar préstamos.', flags: MessageFlags.Ephemeral });
  }

  const prestamoId = interaction.options.getString('id');
  const prestamo = prestamosPendientes.get(prestamoId);

  if (!prestamo) {
    return interaction.reply({ content: '❌ No se encontró ese préstamo o ya fue procesado.', flags: MessageFlags.Ephemeral });
  }

  const embedRechazado = new EmbedBuilder()
    .setTitle('❌ PRÉSTAMO RECHAZADO')
    .setColor(0xFF0000)
    .addFields(
      { name: 'Usuario', value: `<@${prestamo.userId}>`, inline: false },
      { name: 'Cantidad solicitada', value: `**$${prestamo.cantidad.toLocaleString('es-ES')}**`, inline: true }
    );

  await prestamo.channel.send({ embeds: [embedRechazado] });
  await interaction.reply({ content: `❌ Préstamo ID \`${prestamoId}\` rechazado.`, flags: MessageFlags.Ephemeral });

  prestamosPendientes.delete(prestamoId);
}

// ======================
// SUBASTA
// ======================
const subastas = new Map();

async function handleCrearSubasta(interaction) {
  const item = interaction.options.getString('item');
  const precioInicial = interaction.options.getInteger('precio_inicial');
  const duracionHoras = interaction.options.getInteger('duracion_horas');

  if (duracionHoras < 1 || duracionHoras > 72) {
    return interaction.reply({ content: '❌ La duración debe estar entre 1 y 72 horas.', flags: MessageFlags.Ephemeral });
  }

  const subastaId = Date.now().toString();
  const fin = Date.now() + duracionHoras * 3600000;

  const embed = new EmbedBuilder()
    .setTitle('📢 NUEVA SUBASTA')
    .setColor(0xFFD700)
    .addFields(
      { name: 'Artículo', value: item, inline: false },
      { name: 'Precio inicial', value: `**$${precioInicial.toLocaleString('es-ES')}**`, inline: true },
      { name: 'Finaliza en', value: `<t:${Math.floor(fin / 1000)}:R>`, inline: true },
      { name: 'ID de subasta', value: `\`${subastaId}\``, inline: false }
    );

  const mensaje = await interaction.channel.send({ embeds: [embed] });

  subastas.set(subastaId, {
    id: subastaId,
    item: item,
    precioActual: precioInicial,
    mejorPostorId: null,
    mejorPostorTag: null,
    fin: fin,
    mensaje: mensaje,
    channel: interaction.channel
  });

  await interaction.reply({ content: `✅ Subasta creada correctamente.\n**ID:** \`${subastaId}\`\nUsa \`/pujar <id> <cantidad>\` para pujar.`, flags: MessageFlags.Ephemeral });

  setTimeout(() => finalizarSubasta(subastaId), duracionHoras * 3600000);
}

async function handlePujarSubasta(interaction) {
  const subastaId = interaction.options.getString('id');
  const cantidad = interaction.options.getInteger('cantidad');

  const subasta = subastas.get(subastaId);
  if (!subasta) {
    return interaction.reply({ content: '❌ Esta subasta no existe o ya finalizó.', flags: MessageFlags.Ephemeral });
  }

  if (cantidad <= subasta.precioActual) {
    return interaction.reply({ content: `❌ La puja debe ser mayor que el precio actual ($${subasta.precioActual.toLocaleString('es-ES')}).`, flags: MessageFlags.Ephemeral });
  }

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < cantidad) {
    return interaction.reply({ content: '❌ No tienes suficiente dinero para pujar esa cantidad.', flags: MessageFlags.Ephemeral });
  }

  subasta.precioActual = cantidad;
  subasta.mejorPostorId = interaction.user.id;
  subasta.mejorPostorTag = interaction.user.tag;

  const nuevoEmbed = EmbedBuilder.from(subasta.mensaje.embeds[0])
    .setFields(
      { name: 'Artículo', value: subasta.item, inline: false },
      { name: 'Precio actual', value: `**$${subasta.precioActual.toLocaleString('es-ES')}**`, inline: true },
      { name: 'Mejor postor', value: subasta.mejorPostorTag, inline: true },
      { name: 'Finaliza en', value: `<t:${Math.floor(subasta.fin / 1000)}:R>`, inline: true },
      { name: 'ID de subasta', value: `\`${subastaId}\``, inline: false }
    );

  await subasta.mensaje.edit({ embeds: [nuevoEmbed] });
  await interaction.reply({ content: `✅ Pujaste **$${cantidad.toLocaleString('es-ES')}** en la subasta **${subastaId}**.`, flags: MessageFlags.Ephemeral });
}

async function finalizarSubasta(subastaId) {
  const subasta = subastas.get(subastaId);
  if (!subasta) return;

  if (subasta.mejorPostorId) {
    const userData = getUserData(subasta.channel.guild.id, subasta.mejorPostorId);
    userData.dinero -= subasta.precioActual;
    guardarIdentidades();

    const embedFin = new EmbedBuilder()
      .setTitle('🏆 SUBASTA FINALIZADA')
      .setColor(0x00FF00)
      .addFields(
        { name: 'Artículo', value: subasta.item, inline: false },
        { name: 'Ganador', value: subasta.mejorPostorTag, inline: true },
        { name: 'Precio final', value: `**$${subasta.precioActual.toLocaleString('es-ES')}**`, inline: true }
      );

    await subasta.mensaje.edit({ embeds: [embedFin] });
  } else {
    const embedFin = new EmbedBuilder()
      .setTitle('⏰ SUBASTA FINALIZADA')
      .setColor(0xFF0000)
      .setDescription('Nadie pujó por el artículo.');
    await subasta.mensaje.edit({ embeds: [embedFin] });
  }

  subastas.delete(subastaId);
}

// ======================
// SUSPENDER LICENCIA (SOLO POLICÍA)
// ======================
async function handleSuspenderLicencia(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) {
    return interaction.reply({ content: '❌ Solo Policía puede suspender licencias.', flags: MessageFlags.Ephemeral });
  }

  const target = interaction.options.getMember('usuario');
  const tipo = interaction.options.getString('tipo');
  const dias = interaction.options.getInteger('dias');

  const userData = getUserData(interaction.guild.id, target.id);
  const pj = '1'; // Puedes ampliarlo después para elegir PJ

  if (tipo === 'carnet') {
    if (!userData.pjs[pj].carnetConducir) {
      return interaction.reply({ content: `❌ ${target} no tiene carnet de conducir activo.`, flags: MessageFlags.Ephemeral });
    }
    userData.pjs[pj].carnetConducir.suspendidoHasta = Date.now() + (dias * 86400000);
  } else {
    if (!userData.pjs[pj].licenciaArmas) {
      return interaction.reply({ content: `❌ ${target} no tiene licencia de armas activa.`, flags: MessageFlags.Ephemeral });
    }
    userData.pjs[pj].licenciaArmas.suspendidoHasta = Date.now() + (dias * 86400000);
  }

  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('🚫 Licencia Suspendida')
    .setColor(0xFF0000)
    .addFields(
      { name: 'Usuario', value: `${target}`, inline: false },
      { name: 'Tipo', value: tipo === 'carnet' ? '🚗 Carnet de Conducir' : '🔫 Licencia de Armas', inline: true },
      { name: 'Duración', value: `${dias} días`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// ======================
// RULETA
// ======================
async function handleRuleta(interaction) {
  const cantidad = interaction.options.getInteger('cantidad');
  const color = interaction.options.getString('color');

  const userData = getUserData(interaction.guild.id, interaction.user.id);

  if (cantidad < 100) {
    return interaction.reply({ content: '❌ La apuesta mínima es $100.', flags: MessageFlags.Ephemeral });
  }
  if (userData.dinero < cantidad) {
    return interaction.reply({ content: '❌ No tienes suficiente dinero.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply();

  const resultado = Math.random();
  let ganado = false;
  let multiplicador = 0;
  let resultadoTexto = '';

  if (color === 'verde' && resultado < 0.05) {
    ganado = true;
    multiplicador = 14;
    resultadoTexto = '🟢 VERDE';
  } else if (color === 'rojo' && resultado < 0.525) {
    ganado = true;
    multiplicador = 2;
    resultadoTexto = '🔴 ROJO';
  } else if (color === 'negro' && resultado >= 0.525 && resultado < 0.975) {
    ganado = true;
    multiplicador = 2;
    resultadoTexto = '⚫ NEGRO';
  } else {
    resultadoTexto = color === 'rojo' ? '⚫ NEGRO' : color === 'negro' ? '🔴 ROJO' : '🔴 ROJO / ⚫ NEGRO';
  }

  if (ganado) {
    const ganancia = cantidad * multiplicador;
    userData.dinero += ganancia - cantidad;
    guardarIdentidades();

    const embed = new EmbedBuilder()
      .setTitle('🎰 ¡GANASTE!')
      .setColor(0x00FF00)
      .setDescription(`Salió **${resultadoTexto}**`)
      .addFields(
        { name: 'Apostaste', value: `$${cantidad}`, inline: true },
        { name: 'Ganancia', value: `**+$${(ganancia - cantidad).toLocaleString('es-ES')}**`, inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  } else {
    userData.dinero -= cantidad;
    guardarIdentidades();

    const embed = new EmbedBuilder()
      .setTitle('🎰 Perdiste')
      .setColor(0xFF0000)
      .setDescription(`Salió **${resultadoTexto}**`)
      .addFields({ name: 'Perdiste', value: `**-$${cantidad}**` });

    await interaction.editReply({ embeds: [embed] });
  }
}

// ======================
// LOTERIA
// ======================
let lotteryPool = 0;
let lotteryTickets = [];

async function handleLoteria(interaction) {
  const cantidad = interaction.options.getInteger('cantidad');
  const precioBoleto = 500;

  if (cantidad < 1) return interaction.reply({ content: '❌ Mínimo 1 boleto.', flags: MessageFlags.Ephemeral });

  const total = cantidad * precioBoleto;
  const userData = getUserData(interaction.guild.id, interaction.user.id);

  if (userData.dinero < total) {
    return interaction.reply({ content: `❌ No tienes suficiente dinero (necesitas $${total}).`, flags: MessageFlags.Ephemeral });
  }

  userData.dinero -= total;
  guardarIdentidades();

  lotteryPool += total;

  for (let i = 0; i < cantidad; i++) {
    lotteryTickets.push({
      userId: interaction.user.id,
      username: interaction.user.tag
    });
  }

  await interaction.reply({ content: `🎟️ Compraste **${cantidad}** boletos por **$${total}**.\nPozo actual: **$${lotteryPool.toLocaleString('es-ES')}**` });
}

// Sorteo automático cada 24 horas
setInterval(() => {
  if (lotteryTickets.length === 0) return;

  const ganadorIndex = Math.floor(Math.random() * lotteryTickets.length);
  const ganador = lotteryTickets[ganadorIndex];

  const premio = Math.floor(lotteryPool * 0.85);

  const userData = getUserData('guild-id-placeholder', ganador.userId); // se usa el guild actual en uso
  userData.dinero += premio;
  guardarIdentidades();

  console.log(`🎉 LOTERÍA - Ganador: ${ganador.username} | Premio: $${premio}`);

  lotteryPool = 0;
  lotteryTickets = [];
}, 86400000); // 24 horas

// ======================
// VOTACIONES COMPLETAS
// ======================

async function handleVotacion(interaction) {
  await interaction.deferReply();

  const embed = new EmbedBuilder()
    .setTitle('VOTACIÓN DE APERTURA DE SERVIDOR')
    .setDescription('**¿Te unirás a la apertura del servidor?**\nVota con los botones de abajo.\n\n⏰ La votación dura **30 minutos**.\nAl llegar a **5 votos "Me uniré"** se abrirá automáticamente.')
    .setColor(0x5865F2)
    .addFields(
      { name: '✅ Me uniré', value: '0', inline: true },
      { name: '⏰ Me uniré más tarde', value: '0', inline: true },
      { name: '❌ No me uniré', value: '0', inline: true },
      { name: '📊 Progreso', value: createProgressBar(0), inline: false },
      { name: '✅ Votantes - Me uniré', value: 'Nadie', inline: false },
      { name: '⏰ Votantes - Me uniré más tarde', value: 'Nadie', inline: false },
      { name: '❌ Votantes - No me uniré', value: 'Nadie', inline: false }
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_yes').setLabel('Me uniré').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId('vote_later').setLabel('Me uniré más tarde').setStyle(ButtonStyle.Primary).setEmoji('⏰'),
    new ButtonBuilder().setCustomId('vote_no').setLabel('No me uniré').setStyle(ButtonStyle.Danger).setEmoji('❌')
  );

  const mensaje = await interaction.editReply({
    content: '',
    embeds: [embed],
    components: [row]
  });

  const pollData = {
    yes: 0,
    later: 0,
    no: 0,
    voters: new Map(),
    voterNames: new Map(),
    message: mensaje,
    channel: interaction.channel,
    creatorId: interaction.user.id,
    timeout: null
  };

  votes.set(mensaje.id, pollData);
  pollData.timeout = setTimeout(() => cerrarVotacionPorTiempo(mensaje.id), 30 * 60 * 1000);
}

async function handleButtonVote(interaction) {
  const pollData = votes.get(interaction.message.id);
  if (!pollData) {
    return interaction.reply({ content: '❌ Esta votación ya expiró o fue cancelada.', flags: MessageFlags.Ephemeral });
  }

  const customId = interaction.customId;
  const opcion = customId === 'vote_yes' ? 'yes' : customId === 'vote_later' ? 'later' : 'no';
  const userId = interaction.user.id;
  const displayName = interaction.member?.displayName || interaction.user.tag;

  const votoAnterior = pollData.voters.get(userId);

  if (votoAnterior === opcion) {
    return interaction.reply({ content: '✅ Ya habías votado esta opción.', flags: MessageFlags.Ephemeral });
  }

  if (votoAnterior) pollData[votoAnterior]--;
  pollData[opcion]++;
  pollData.voters.set(userId, opcion);
  pollData.voterNames.set(userId, displayName);

  const votosQueCuentan = pollData.yes + pollData.later;
  const nuevaBarra = createProgressBar(votosQueCuentan);

  const nuevoEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setFields(
      { name: '✅ Me uniré', value: pollData.yes.toString(), inline: true },
      { name: '⏰ Me uniré más tarde', value: pollData.later.toString(), inline: true },
      { name: '❌ No me uniré', value: pollData.no.toString(), inline: true },
      { name: '📊 Progreso', value: nuevaBarra, inline: false },
      { name: '✅ Votantes - Me uniré', value: getVoterList(pollData, 'yes'), inline: false },
      { name: '⏰ Votantes - Me uniré más tarde', value: getVoterList(pollData, 'later'), inline: false },
      { name: '❌ Votantes - No me uniré', value: getVoterList(pollData, 'no'), inline: false }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_yes').setLabel('Me uniré').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId('vote_later').setLabel('Me uniré más tarde').setStyle(ButtonStyle.Primary).setEmoji('⏰'),
    new ButtonBuilder().setCustomId('vote_no').setLabel('No me uniré').setStyle(ButtonStyle.Danger).setEmoji('❌')
  );

  if (pollData.yes >= 5) {
    row.components.forEach(btn => btn.setDisabled(true));
    await interaction.update({ embeds: [nuevoEmbed], components: [row] });
    if (pollData.timeout) clearTimeout(pollData.timeout);
    await abrirServidorAutomatico(interaction.channel, pollData);
    votes.delete(interaction.message.id);
    return;
  }

  await interaction.update({ embeds: [nuevoEmbed], components: [row] });
}

async function handleCancelarVotacion(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let pollData = null;
  let messageIdToCancel = null;

  for (const [msgId, data] of votes.entries()) {
    if (data.channel.id === interaction.channel.id) {
      pollData = data;
      messageIdToCancel = msgId;
      break;
    }
  }

  if (!pollData) return interaction.editReply({ content: '❌ No hay ninguna votación activa en este canal.' });

  const isCreator = pollData.creatorId === interaction.user.id;
  const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!isCreator && !isAdmin) {
    return interaction.editReply({ content: '❌ Solo el creador o un Administrador puede cancelarla.' });
  }

  if (pollData.timeout) clearTimeout(pollData.timeout);

  const cancelEmbed = EmbedBuilder.from(pollData.message.embeds[0])
    .setDescription('**❌ Votación cancelada manualmente**')
    .setColor(0xFF0000);

  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_yes').setLabel('Me uniré').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(true),
    new ButtonBuilder().setCustomId('vote_later').setLabel('Me uniré más tarde').setStyle(ButtonStyle.Primary).setEmoji('⏰').setDisabled(true),
    new ButtonBuilder().setCustomId('vote_no').setLabel('No me uniré').setStyle(ButtonStyle.Danger).setEmoji('❌').setDisabled(true)
  );

  await pollData.message.edit({ embeds: [cancelEmbed], components: [disabledRow] });
  await interaction.editReply({ content: '✅ Votación cancelada correctamente.' });
  await pollData.channel.send('❌ **La votación ha sido cancelada manualmente.**');

  votes.delete(messageIdToCancel);
}

async function handleAbrirServer(interaction) {
  await interaction.deferReply();

  let pollData = null;
  let messageIdToRemove = null;

  for (const [msgId, data] of votes.entries()) {
    if (data.channel.id === interaction.channel.id) {
      pollData = data;
      messageIdToRemove = msgId;
      break;
    }
  }

  let mencionesSi = '';
  let mencionesTarde = '';
  if (pollData) {
    pollData.voters.forEach((opcion, userId) => {
      if (opcion === 'yes') mencionesSi += `<@${userId}> `;
      else if (opcion === 'later') mencionesTarde += `<@${userId}> `;
    });
    if (pollData.timeout) clearTimeout(pollData.timeout);
    votes.delete(messageIdToRemove);
  }

  serverAbierto = true;
  ultimaApertura = Date.now();

  const pingContent = `**Se unirán:** ${mencionesSi || '*Nadie*'}\n**Se unirán más tarde:** ${mencionesTarde || '*Nadie*'}`;

  const embed = new EmbedBuilder()
    .setTitle('🔓 ¡EL SERVIDOR ESTÁ ABIERTO!')
    .setDescription('**¡Atención!**\nTienen **10 minutos** para unirse al servidor.\n\n¡Que lo pasen genial!')
    .setColor(0x00FF00)
    .setImage('https://tenor.com/es/view/abierto-te-esperamos-local-negocio-letrero-gif-12287454104567600625')
    .setTimestamp();

  await interaction.editReply({
    content: pingContent,
    embeds: [embed]
  });
}

async function abrirServidorAutomatico(channel, pollData) {
  let mencionesSi = '';
  let mencionesTarde = '';
  pollData.voters.forEach((opcion, userId) => {
    if (opcion === 'yes') mencionesSi += `<@${userId}> `;
    else if (opcion === 'later') mencionesTarde += `<@${userId}> `;
  });

  serverAbierto = true;
  ultimaApertura = Date.now();

  const pingContent = `**Se unirán:** ${mencionesSi || '*Nadie*'}\n**Se unirán más tarde:** ${mencionesTarde || '*Nadie*'}`;

  const embed = new EmbedBuilder()
    .setTitle('🔓 ¡EL SERVIDOR SE HA ABIERTO AUTOMÁTICAMENTE!')
    .setDescription('Se alcanzó el mínimo de **5 votos "Me uniré"**.\n\nTienen **10 minutos** para unirse.\n\n¡Diviértanse!')
    .setColor(0x00FF00)
    .setImage('https://tenor.com/es/view/abierto-te-esperamos-local-negocio-letrero-gif-12287454104567600625')
    .setTimestamp();

  await channel.send({
    content: pingContent,
    embeds: [embed]
  });
}

async function handleCerrarServer(interaction) {
  await interaction.deferReply();
  serverAbierto = false;

  const embed = new EmbedBuilder()
    .setTitle('🔒 SERVIDOR CERRADO')
    .setDescription('**¡Gracias por unirse!**\n\nAgradecemos a todos los que participaron.\n\n¡Hasta la próxima!')
    .setColor(0xFF0000)
    .setTimestamp();

  await interaction.editReply({ content: '@everyone', embeds: [embed] });
}

async function cerrarVotacionPorTiempo(messageId) {
  const pollData = votes.get(messageId);
  if (!pollData) return;

  const nuevoEmbed = EmbedBuilder.from(pollData.message.embeds[0])
    .setDescription('**⏰ Votación expirada**\nLa votación ha durado 30 minutos y se ha cerrado automáticamente.')
    .setColor(0xFF9900);

  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_yes').setLabel('Me uniré').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(true),
    new ButtonBuilder().setCustomId('vote_later').setLabel('Me uniré más tarde').setStyle(ButtonStyle.Primary).setEmoji('⏰').setDisabled(true),
    new ButtonBuilder().setCustomId('vote_no').setLabel('No me uniré').setStyle(ButtonStyle.Danger).setEmoji('❌').setDisabled(true)
  );

  try {
    await pollData.message.edit({ embeds: [nuevoEmbed], components: [disabledRow] });
    await pollData.channel.send('⏰ **La votación ha expirado** después de 30 minutos.');
  } catch (error) {
    console.error('❌ Error al cerrar votación por tiempo:', error);
  }

  if (pollData.timeout) clearTimeout(pollData.timeout);
  votes.delete(messageId);
}
// ======================
// PANEL DNI
// ======================
async function handlePanelDni(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden crear el panel de DNI.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setTitle('🪪 SISTEMA OFICIAL DE DNI - ALBACETE RP')
    .setDescription('**Cada jugador puede tener hasta 2 personajes (PJ1 y PJ2).**\n\n' +
      '• Crea tu DNI con tus datos reales del personaje.\n' +
      '• Con el DNI podrás sacar **Carnet de Conducir** y **Licencia de Armas**.\n' +
      '• Solo tú puedes gestionar tus documentos.\n' +
      '• Los administradores pueden borrar documentos si es necesario.\n\n' +
      'Usa los botones de abajo:')
    .setColor(0x00FFAA)
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dni-crear').setLabel('Crear DNI').setStyle(ButtonStyle.Primary).setEmoji('🪪'),
    new ButtonBuilder().setCustomId('dni-ver').setLabel('Ver DNI').setStyle(ButtonStyle.Secondary).setEmoji('🔎'),
    new ButtonBuilder().setCustomId('dni-borrar').setLabel('Borrar DNI').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('carnet-crear').setLabel('Crear Carnet Conducir').setStyle(ButtonStyle.Primary).setEmoji('🚗'),
    new ButtonBuilder().setCustomId('carnet-ver').setLabel('Ver Carnet').setStyle(ButtonStyle.Secondary).setEmoji('🔎'),
    new ButtonBuilder().setCustomId('carnet-borrar').setLabel('Borrar Carnet').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('licencia-crear').setLabel('Crear Licencia Armas').setStyle(ButtonStyle.Primary).setEmoji('🔫'),
    new ButtonBuilder().setCustomId('licencia-ver').setLabel('Ver Licencia').setStyle(ButtonStyle.Secondary).setEmoji('🔎'),
    new ButtonBuilder().setCustomId('licencia-borrar').setLabel('Borrar Licencia').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
  );

  await interaction.channel.send({ embeds: [embed], components: [row1, row2, row3] });
  await interaction.editReply({ content: '✅ Panel de DNI creado correctamente.' });
}

// ======================
// PANEL DNI
// ======================
async function handlePanelDni(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden crear el panel de DNI.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setTitle('🪪 SISTEMA OFICIAL DE DNI - ALBACETE RP')
    .setDescription('**Cada jugador puede tener hasta 2 personajes (PJ1 y PJ2).**\n\n' +
      '• Crea tu DNI con tus datos reales del personaje.\n' +
      '• Con el DNI podrás sacar **Carnet de Conducir** y **Licencia de Armas**.\n' +
      '• Solo tú puedes gestionar tus documentos.\n' +
      '• Los administradores pueden borrar documentos si es necesario.\n\n' +
      'Usa los botones de abajo:')
    .setColor(0x00FFAA)
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dni-crear').setLabel('Crear DNI').setStyle(ButtonStyle.Primary).setEmoji('🪪'),
    new ButtonBuilder().setCustomId('dni-ver').setLabel('Ver DNI').setStyle(ButtonStyle.Secondary).setEmoji('🔎'),
    new ButtonBuilder().setCustomId('dni-borrar').setLabel('Borrar DNI').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('carnet-crear').setLabel('Crear Carnet Conducir').setStyle(ButtonStyle.Primary).setEmoji('🚗'),
    new ButtonBuilder().setCustomId('carnet-ver').setLabel('Ver Carnet').setStyle(ButtonStyle.Secondary).setEmoji('🔎'),
    new ButtonBuilder().setCustomId('carnet-borrar').setLabel('Borrar Carnet').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('licencia-crear').setLabel('Crear Licencia Armas').setStyle(ButtonStyle.Primary).setEmoji('🔫'),
    new ButtonBuilder().setCustomId('licencia-ver').setLabel('Ver Licencia').setStyle(ButtonStyle.Secondary).setEmoji('🔎'),
    new ButtonBuilder().setCustomId('licencia-borrar').setLabel('Borrar Licencia').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
  );

  await interaction.channel.send({ embeds: [embed], components: [row1, row2, row3] });
  await interaction.editReply({ content: '✅ Panel de DNI creado correctamente.' });
}

// ======================
// BOTONES DEL SISTEMA DNI
// ======================
async function handleDniButton(interaction) {
  try {
    const customId = interaction.customId;
    let modal;

    if (customId === 'dni-crear') {
      modal = new ModalBuilder()
        .setCustomId('modal-dni-crear')
        .setTitle('🪪 Crear DNI - Personaje');

      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pj').setLabel('Número de PJ').setPlaceholder('1 o 2').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(1)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nombreCompleto').setLabel('Nombre Completo').setPlaceholder('Ej: Juan Pérez').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(60)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('fechaNac').setLabel('Fecha de Nacimiento').setPlaceholder('DD/MM/AAAA').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(10)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nacionalidad').setLabel('Nacionalidad').setPlaceholder('Ej: Argentina, España...').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(40)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('genero').setLabel('Género').setPlaceholder('Ej: Masculino, Femenino...').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(20))
      );
    } 
    else if (customId === 'dni-ver' || customId === 'dni-borrar') {
      modal = new ModalBuilder()
        .setCustomId(customId === 'dni-ver' ? 'modal-dni-ver' : 'modal-dni-borrar')
        .setTitle(customId === 'dni-ver' ? '🔎 Ver DNI' : '🗑️ Borrar DNI');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('pj').setLabel('Número de PJ').setPlaceholder('1 o 2').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(1)
        )
      );
    } 
    else if (customId.startsWith('carnet-') || customId.startsWith('licencia-')) {
      const tipo = customId.startsWith('carnet') ? 'carnet' : 'licencia';
      const action = customId.split('-')[1];
      const titulo = tipo === 'carnet' 
        ? (action === 'crear' ? '🚗 Crear Carnet de Conducir' : action === 'ver' ? '🔎 Ver Carnet' : '🗑️ Borrar Carnet')
        : (action === 'crear' ? '🔫 Crear Licencia de Armas' : action === 'ver' ? '🔎 Ver Licencia' : '🗑️ Borrar Licencia');

      modal = new ModalBuilder()
        .setCustomId(`modal-${tipo}-${action}`)
        .setTitle(titulo);

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('pj').setLabel('Número de PJ').setPlaceholder('1 o 2').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(1)
        )
      );
    }

    if (modal) await interaction.showModal(modal);
  } catch (error) {
    console.error('❌ Error en handleDniButton:', error);
  }
}

/// ======================
// MODALES DEL SISTEMA DNI
// ======================
async function handleModalSubmit(interaction) {
  try {
    const customId = interaction.customId;
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const userData = getUserData(guildId, userId);

    // ==================== CREAR DNI ====================
    if (customId === 'modal-dni-crear') {
      const pj = interaction.fields.getTextInputValue('pj').trim();
      const nombreCompleto = interaction.fields.getTextInputValue('nombreCompleto').trim();
      const fechaNac = interaction.fields.getTextInputValue('fechaNac').trim();
      const nacionalidad = interaction.fields.getTextInputValue('nacionalidad').trim();
      const genero = interaction.fields.getTextInputValue('genero').trim();

      if (pj !== '1' && pj !== '2') {
        return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', flags: MessageFlags.Ephemeral });
      }
      if (userData.pjs[pj].dni) {
        return interaction.reply({ content: `❌ Ya tienes un DNI creado para el PJ${pj}.`, flags: MessageFlags.Ephemeral });
      }
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaNac)) {
        return interaction.reply({ content: '❌ Formato de fecha incorrecto. Usa DD/MM/AAAA', flags: MessageFlags.Ephemeral });
      }

      const [nombre, ...apellidoParts] = nombreCompleto.split(' ');
      const apellido = apellidoParts.join(' ') || 'Sin apellido';

      const dniNumero = Math.floor(10000000 + Math.random() * 90000000).toString();
      const fechaCreacion = new Date().toLocaleDateString('es-ES');

      userData.pjs[pj].dni = {
        numero: dniNumero,
        nombre,
        apellido,
        fechaNac,
        nacionalidad,
        genero,
        fechaCreacion
      };

      guardarIdentidades();

      const embed = new EmbedBuilder()
        .setTitle(`✅ DNI Creado - PJ${pj}`)
        .setColor(0x00FFAA)
        .addFields(
          { name: 'DNI', value: dniNumero, inline: true },
          { name: 'Nombre Completo', value: `${nombre} ${apellido}`, inline: true },
          { name: 'Fecha Nacimiento', value: fechaNac, inline: true },
          { name: 'Nacionalidad', value: nacionalidad, inline: true },
          { name: 'Género', value: genero, inline: true },
          { name: 'Creado', value: fechaCreacion, inline: true }
        );

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // ==================== VER / BORRAR DNI ====================
    if (customId === 'modal-dni-ver' || customId === 'modal-dni-borrar') {
      const pj = interaction.fields.getTextInputValue('pj').trim();
      if (pj !== '1' && pj !== '2') {
        return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', flags: MessageFlags.Ephemeral });
      }

      const dni = userData.pjs[pj].dni;
      if (!dni) {
        return interaction.reply({ content: `❌ No tienes DNI en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
      }

      if (customId === 'modal-dni-ver') {
        const embed = new EmbedBuilder()
          .setTitle(`🔎 DNI OFICIAL - PJ${pj}`)
          .setColor(0x00AAFF)
          .addFields(
            { name: 'DNI', value: dni.numero, inline: true },
            { name: 'Nombre Completo', value: `${dni.nombre} ${dni.apellido}`, inline: true },
            { name: 'Fecha Nacimiento', value: dni.fechaNac, inline: true },
            { name: 'Nacionalidad', value: dni.nacionalidad, inline: true },
            { name: 'Género', value: dni.genero, inline: true },
            { name: 'Creado', value: dni.fechaCreacion, inline: true }
          )
          .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

        const channel = interaction.guild.channels.cache.get(DNI_CHANNEL_ID);
        if (channel) {
          await channel.send({ embeds: [embed] });
          await interaction.reply({ content: `✅ DNI del PJ${pj} enviado al canal correspondiente.`, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: '❌ No se encontró el canal de DNI.', flags: MessageFlags.Ephemeral });
        }
      } else {
        userData.pjs[pj].dni = null;
        userData.pjs[pj].carnetConducir = null;
        userData.pjs[pj].licenciaArmas = null;
        guardarIdentidades();
        await interaction.reply({ content: `🗑️ DNI y documentos del PJ${pj} eliminados.`, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // ==================== CARNET DE CONDUCIR ====================
    if (customId.startsWith('modal-carnet-')) {
      const action = customId.split('-')[2];
      const pj = interaction.fields.getTextInputValue('pj').trim();

      if (pj !== '1' && pj !== '2') {
        return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', flags: MessageFlags.Ephemeral });
      }

      const dni = userData.pjs[pj].dni;
      if (!dni) {
        return interaction.reply({ content: `❌ Primero debes crear el DNI del PJ${pj}.`, flags: MessageFlags.Ephemeral });
      }

      if (action === 'crear') {
        if (userData.pjs[pj].carnetConducir) {
          return interaction.reply({ content: `❌ Ya tienes carnet de conducir en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
        }
        const numero = `CC-${Math.floor(1000 + Math.random() * 9000)}`;
        const fecha = new Date().toLocaleDateString('es-ES');
        userData.pjs[pj].carnetConducir = { numero, fechaEmision: fecha };
        guardarIdentidades();
        await interaction.reply({ content: `✅ Carnet de Conducir creado para PJ${pj}\n**Número:** ${numero}`, flags: MessageFlags.Ephemeral });
      } 
      else if (action === 'ver') {
        const carnet = userData.pjs[pj].carnetConducir;
        if (!carnet) return interaction.reply({ content: `❌ No tienes carnet de conducir en el PJ${pj}.`, flags: MessageFlags.Ephemeral });

        const embed = new EmbedBuilder()
          .setTitle(`🚗 CARNET DE CONDUCIR - PJ${pj}`)
          .setColor(0x00FF88)
          .addFields(
            { name: 'Número', value: carnet.numero, inline: true },
            { name: 'Emitido', value: carnet.fechaEmision, inline: true }
          )
          .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

        const channel = interaction.guild.channels.cache.get(CARNET_CHANNEL_ID);
        if (channel) {
          await channel.send({ embeds: [embed] });
          await interaction.reply({ content: `✅ Carnet enviado al canal de Carnets.`, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: '❌ No se encontró el canal de Carnets.', flags: MessageFlags.Ephemeral });
        }
      } 
      else if (action === 'borrar') {
        if (!userData.pjs[pj].carnetConducir) {
          return interaction.reply({ content: `❌ No tienes carnet para borrar en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
        }
        userData.pjs[pj].carnetConducir = null;
        guardarIdentidades();
        await interaction.reply({ content: `🗑️ Carnet de conducir del PJ${pj} eliminado.`, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // ==================== LICENCIA DE ARMAS ====================
    if (customId.startsWith('modal-licencia-')) {
      const action = customId.split('-')[2];
      const pj = interaction.fields.getTextInputValue('pj').trim();

      if (pj !== '1' && pj !== '2') {
        return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', flags: MessageFlags.Ephemeral });
      }

      const dni = userData.pjs[pj].dni;
      if (!dni) {
        return interaction.reply({ content: `❌ Primero debes crear el DNI del PJ${pj}.`, flags: MessageFlags.Ephemeral });
      }

      if (action === 'crear') {
        if (userData.pjs[pj].licenciaArmas) {
          return interaction.reply({ content: `❌ Ya tienes licencia de armas en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
        }
        const numero = `LA-${Math.floor(1000 + Math.random() * 9000)}`;
        const fecha = new Date().toLocaleDateString('es-ES');
        userData.pjs[pj].licenciaArmas = { numero, fechaEmision: fecha };
        guardarIdentidades();
        await interaction.reply({ content: `✅ Licencia de Armas creada para PJ${pj}\n**Número:** ${numero}`, flags: MessageFlags.Ephemeral });
      } 
      else if (action === 'ver') {
        const licencia = userData.pjs[pj].licenciaArmas;
        if (!licencia) return interaction.reply({ content: `❌ No tienes licencia de armas en el PJ${pj}.`, flags: MessageFlags.Ephemeral });

        const embed = new EmbedBuilder()
          .setTitle(`🔫 LICENCIA DE ARMAS - PJ${pj}`)
          .setColor(0xFF8800)
          .addFields(
            { name: 'Número', value: licencia.numero, inline: true },
            { name: 'Emitida', value: licencia.fechaEmision, inline: true }
          )
          .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

        const channel = interaction.guild.channels.cache.get(LICENCIA_CHANNEL_ID);
        if (channel) {
          await channel.send({ embeds: [embed] });
          await interaction.reply({ content: `✅ Licencia enviada al canal de Licencias.`, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: '❌ No se encontró el canal de Licencias.', flags: MessageFlags.Ephemeral });
        }
      } 
      else if (action === 'borrar') {
        if (!userData.pjs[pj].licenciaArmas) {
          return interaction.reply({ content: `❌ No tienes licencia para borrar en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
        }
        userData.pjs[pj].licenciaArmas = null;
        guardarIdentidades();
        await interaction.reply({ content: `🗑️ Licencia de armas del PJ${pj} eliminada.`, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // ==================== ARRESTO ====================
    if (customId === 'modal-arrestar') {
      const nombreIC = interaction.fields.getTextInputValue('nombre_ic');
      const articulos = interaction.fields.getTextInputValue('articulos');
      const policias = interaction.fields.getTextInputValue('policias');
      const tiempo = interaction.fields.getTextInputValue('tiempo');

      const embed = new EmbedBuilder()
        .setTitle('🚔 ARRESTO REGISTRADO')
        .setColor(0xFF0000)
        .setTimestamp()
        .addFields(
          { name: '👤 Nombre IC (arrestado)', value: nombreIC, inline: false },
          { name: '📜 Artículos', value: articulos, inline: false },
          { name: '👮 Policías', value: policias, inline: false },
          { name: '⏳ Tiempo en cárcel', value: tiempo, inline: false }
        )
        .setFooter({ text: `Arrestado por: ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
      return;
    }

  } catch (error) {
    console.error('❌ Error en handleModalSubmit:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Ocurrió un error al procesar el formulario.', flags: MessageFlags.Ephemeral });
    }
  }
}

// ======================
// COMANDOS ADMIN DNI + POLICÍA
// ======================
async function handleBorrarDniAdmin(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }

  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');

  const userData = getUserData(interaction.guild.id, target.id);

  if (!userData.pjs[pj].dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  userData.pjs[pj].dni = null;
  userData.pjs[pj].carnetConducir = null;
  userData.pjs[pj].licenciaArmas = null;
  guardarIdentidades();

  await interaction.reply(`✅ **DNI y todos los documentos del PJ${pj} de ${target} han sido eliminados.**`);
}

async function handleVerDniAdmin(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }

  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');

  const userData = getUserData(interaction.guild.id, target.id);
  const dni = userData.pjs[pj].dni;

  if (!dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔎 DNI de ${target.user.tag} - PJ${pj}`)
    .setColor(0x00AAFF)
    .addFields(
      { name: 'DNI', value: dni.numero, inline: true },
      { name: 'Nombre Completo', value: `${dni.nombre} ${dni.apellido}`, inline: true },
      { name: 'Fecha Nacimiento', value: dni.fechaNac, inline: true },
      { name: 'Nacionalidad', value: dni.nacionalidad, inline: true },
      { name: 'Género', value: dni.genero, inline: true },
      { name: 'Creado', value: dni.fechaCreacion, inline: true }
    )
    .setThumbnail(target.user.displayAvatarURL());

  await interaction.reply({ embeds: [embed] });
}

async function handleBuscarDni(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) {
    return interaction.reply({ content: '❌ Solo Policía y Staff pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }

  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');

  const userData = getUserData(interaction.guild.id, target.id);
  const dni = userData.pjs[pj].dni;

  if (!dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI registrado en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 DNI ENCONTRADO - PJ${pj}`)
    .setColor(0x00AAFF)
    .setThumbnail(target.user.displayAvatarURL())
    .addFields(
      { name: '👤 Usuario', value: `${target} (\`${target.id}\`)`, inline: false },
      { name: '🪪 DNI', value: dni.numero, inline: true },
      { name: 'Nombre Completo', value: `${dni.nombre} ${dni.apellido}`, inline: true },
      { name: 'Fecha Nacimiento', value: dni.fechaNac, inline: true },
      { name: 'Nacionalidad', value: dni.nacionalidad, inline: true },
      { name: 'Género', value: dni.genero, inline: true },
      { name: 'Creado', value: dni.fechaCreacion, inline: true }
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleVerDniPublico(interaction) {
  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');

  const userData = getUserData(interaction.guild.id, target.id);
  const dni = userData.pjs[pj].dni;

  if (!dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 DNI DE ${target.user.tag} - PJ${pj}`)
    .setColor(0x00AAFF)
    .setThumbnail(target.user.displayAvatarURL())
    .addFields(
      { name: '🪪 DNI', value: dni.numero, inline: true },
      { name: 'Nombre Completo', value: `${dni.nombre} ${dni.apellido}`, inline: true },
      { name: 'Fecha Nacimiento', value: dni.fechaNac, inline: true },
      { name: 'Nacionalidad', value: dni.nacionalidad, inline: true },
      { name: 'Género', value: dni.genero, inline: true },
      { name: 'Creado', value: dni.fechaCreacion, inline: true }
    );

  await interaction.reply({ embeds: [embed] });
}

// ======================
// MULTA Y ARRESTO
// ======================
async function handleMulta(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) {
    return interaction.reply({ content: '❌ Solo Policía puede multar.', flags: MessageFlags.Ephemeral });
  }

  const miembro = interaction.options.getMember('usuario');
  const cantidad = interaction.options.getInteger('cantidad');
  const razon = interaction.options.getString('razon');
  const guildId = interaction.guild.id;

  if (!sanciones[guildId]) sanciones[guildId] = [];
  const sanctionId = sanciones[guildId].length + 1;

  const registro = {
    id: sanctionId,
    user_id: miembro.id,
    user_name: miembro.user.tag,
    mod_id: interaction.user.id,
    mod_name: interaction.user.tag,
    tipo: '💰 Multa',
    razon: `${razon} | Cantidad: $${cantidad.toLocaleString('es-ES')}`,
    timestamp: new Date().toISOString()
  };
  sanciones[guildId].push(registro);
  guardarSanciones();

  const userData = getUserData(guildId, miembro.id);
  userData.dinero -= cantidad;
  if (userData.dinero < 0) userData.dinero = 0;
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('💰 MULTA REGISTRADA')
    .setColor(0xFFAA00)
    .addFields(
      { name: 'Usuario', value: `${miembro}`, inline: false },
      { name: 'Cantidad', value: `**$${cantidad.toLocaleString('es-ES')}**`, inline: true },
      { name: 'Nuevo balance', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: true },
      { name: 'Razón', value: razon, inline: false }
    )
    .setFooter({ text: `Multa ID: ${sanctionId}` });

  await interaction.reply({ embeds: [embed] });
  try { await miembro.send({ embeds: [embed] }); } catch {}
}

async function handleArrestar(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) {
    return interaction.reply({ content: '❌ Solo Policía puede arrestar.', flags: MessageFlags.Ephemeral });
  }

  const modal = new ModalBuilder()
    .setCustomId('modal-arrestar')
    .setTitle('🚔 Formulario de Arresto');

  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nombre_ic').setLabel('Nombre IC (arrestado)').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('articulos').setLabel('Artículos').setStyle(TextInputStyle.Paragraph).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('policias').setLabel('Policías que realizaron el arresto').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tiempo').setLabel('Tiempo en cárcel (ej: 30 minutos)').setStyle(TextInputStyle.Short).setRequired(true))
  );

  await interaction.showModal(modal);
}

// ======================
// ANUNCIO RP
// ======================
async function handleAnuncioRp(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ Solo Staff puede crear anuncios.', flags: MessageFlags.Ephemeral });
  }

  const titulo = interaction.options.getString('titulo');
  const descripcion = interaction.options.getString('descripcion');
  let colorHex = interaction.options.getString('color') || '#00FFAA';
  const color = parseInt(colorHex.replace('#', ''), 16);

  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descripcion)
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: `Anuncio RP • ${interaction.guild.name}` });

  await interaction.reply({ embeds: [embed] });
}

// ======================
// ESTADO SERVER
// ======================
async function handleEstadoServer(interaction) {
  const estado = serverAbierto ? '🟢 **ABIERTO**' : '🔴 **CERRADO**';
  let texto = `**Estado actual:** ${estado}\n`;
  if (serverAbierto && ultimaApertura) {
    texto += `**Abierto desde:** <t:${Math.floor(ultimaApertura / 1000)}:R>\n`;
  }
  let votacionActiva = 'No hay votación activa.';
  for (const [_, poll] of votes.entries()) {
    if (poll.channel.id === interaction.channel.id) {
      votacionActiva = `✅ **Votación activa** (${poll.yes + poll.later + poll.no} votos)`;
      break;
    }
  }
  texto += `\n${votacionActiva}`;

  const embed = new EmbedBuilder()
    .setTitle('📡 ESTADO DEL SERVIDOR RP')
    .setDescription(texto)
    .setColor(serverAbierto ? 0x00FF00 : 0xFF0000)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// ======================
// ECONOMÍA
// ======================
async function handleBalance(interaction) {
  const target = interaction.options.getMember('usuario') || interaction.member;
  const userData = getUserData(interaction.guild.id, target.id);

  const embed = new EmbedBuilder()
    .setTitle(`💰 Balance de ${target.user.tag}`)
    .setColor(0x00FFAA)
    .addFields({ name: 'Dinero actual', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: false })
    .setThumbnail(target.user.displayAvatarURL());

  await interaction.reply({ embeds: [embed] });
}

async function handleAddMoney(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }

  const target = interaction.options.getMember('usuario');
  const cantidad = interaction.options.getInteger('cantidad');
  const userData = getUserData(interaction.guild.id, target.id);

  userData.dinero += cantidad;
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('💰 Dinero modificado')
    .setColor(cantidad >= 0 ? 0x00FF88 : 0xFF0000)
    .addFields(
      { name: 'Usuario', value: `${target}`, inline: false },
      { name: 'Cantidad', value: `${cantidad >= 0 ? '+' : ''}$${cantidad.toLocaleString('es-ES')}`, inline: true },
      { name: 'Nuevo balance', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: true }
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleSueldo(interaction) {
  await interaction.deferReply();
  const userData = getUserData(interaction.guild.id, interaction.user.id);
  const member = interaction.member;
  const ahora = Date.now();

  if (userData.lastSalary && ahora - userData.lastSalary < 86400000) {
    const tiempoRestante = Math.ceil((86400000 - (ahora - userData.lastSalary)) / 3600000);
    return interaction.editReply(`⏳ Ya cobraste tu sueldo. Próximo cobro en **${tiempoRestante} horas**.`);
  }

  let bonus = 0;
  for (const [roleId, amount] of Object.entries(ROLE_BONUSES)) {
    if (member.roles.cache.has(roleId)) bonus += amount;
  }

  const totalSueldo = SALARY_BASE + bonus;
  userData.dinero += totalSueldo;
  userData.lastSalary = ahora;
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('💼 ¡Sueldo cobrado!')
    .setColor(0x00FFAA)
    .addFields(
      { name: 'Sueldo base', value: `**$${SALARY_BASE}**`, inline: true },
      { name: 'Bonus por roles', value: `**+$${bonus}**`, inline: true },
      { name: 'Total recibido', value: `**$${totalSueldo.toLocaleString('es-ES')}**`, inline: false },
      { name: 'Nuevo balance', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: false }
    );

  await interaction.editReply({ embeds: [embed] });
}

async function handleTransferir(interaction) {
  const target = interaction.options.getMember('usuario');
  const cantidad = interaction.options.getInteger('cantidad');

  if (cantidad < 100) return interaction.reply({ content: '❌ La cantidad mínima es 100 $.', flags: MessageFlags.Ephemeral });

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  const targetData = getUserData(interaction.guild.id, target.id);

  if (userData.dinero < cantidad) return interaction.reply({ content: '❌ No tienes suficiente dinero.', flags: MessageFlags.Ephemeral });

  userData.dinero -= cantidad;
  targetData.dinero += cantidad;
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('💸 Transferencia realizada')
    .setColor(0x00AAFF)
    .addFields(
      { name: 'De', value: interaction.user.toString(), inline: true },
      { name: 'Para', value: target.toString(), inline: true },
      { name: 'Cantidad', value: `**$${cantidad.toLocaleString('es-ES')}**`, inline: false }
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleApostar(interaction) {
  const cantidad = interaction.options.getInteger('cantidad');
  const opcion = interaction.options.getString('opcion');

  if (cantidad < 100) return interaction.reply({ content: '❌ La apuesta mínima es 100 $.', flags: MessageFlags.Ephemeral });

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < cantidad) return interaction.reply({ content: '❌ No tienes suficiente dinero.', flags: MessageFlags.Ephemeral });

  const gana = Math.random() < 0.5;

  if (gana) {
    const ganancia = cantidad * 2;
    userData.dinero += ganancia - cantidad;
    guardarIdentidades();

    const embedWin = new EmbedBuilder()
      .setTitle('🎉 ¡GANASTE!')
      .setColor(0x00FF00)
      .setDescription(`**${opcion.toUpperCase()}** salió!`)
      .addFields({ name: 'Ganancia', value: `**+$${cantidad.toLocaleString('es-ES')}**` });

    await interaction.reply({ embeds: [embedWin] });
  } else {
    userData.dinero -= cantidad;
    guardarIdentidades();

    const embedLose = new EmbedBuilder()
      .setTitle('😢 Perdiste')
      .setColor(0xFF0000)
      .setDescription(`Salió **${opcion === 'cara' ? 'CRUZ' : 'CARA'}**...`)
      .addFields({ name: 'Perdiste', value: `**-$${cantidad.toLocaleString('es-ES')}**` });

    await interaction.reply({ embeds: [embedLose] });
  }
}

async function handleLeaderboard(interaction) {
  await interaction.deferReply();

  const guildData = identidades[interaction.guild.id] || {};
  const ranking = Object.entries(guildData)
    .map(([userId, data]) => ({ userId, dinero: data.dinero ?? 0 }))
    .filter(u => u.dinero > 0)
    .sort((a, b) => b.dinero - a.dinero)
    .slice(0, 10);

  if (ranking.length === 0) return interaction.editReply('📭 Todavía no hay nadie con dinero.');

  const embed = new EmbedBuilder()
    .setTitle('🏆 TABLA DE CLASIFICACIÓN - MÁS RICOS')
    .setColor(0xFFD700)
    .setTimestamp();

  ranking.forEach((entry, i) => {
    const member = interaction.guild.members.cache.get(entry.userId);
    const name = member ? member.user.tag : `ID: ${entry.userId}`;
    const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**#${i+1}**`;
    embed.addFields({ name: `${medalla} ${name}`, value: `**$${entry.dinero.toLocaleString('es-ES')}**`, inline: false });
  });

  await interaction.editReply({ embeds: [embed] });
}

// ======================
// TIENDA COMPLETA
// ======================

async function handleAgregarProducto(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores pueden añadir productos.', flags: MessageFlags.Ephemeral });
  }

  const nombre = interaction.options.getString('nombre');
  const precio = interaction.options.getInteger('precio');
  const descripcion = interaction.options.getString('descripcion');
  const stockInput = interaction.options.getInteger('stock');
  const stock = (stockInput === 0 || stockInput === null) ? null : stockInput;
  const emoji = interaction.options.getString('emoji') || '📦';

  const guildTienda = getGuildTienda(interaction.guild.id);
  guildTienda.push({
    id: Date.now().toString(),
    nombre,
    precio,
    descripcion,
    stock,
    emoji
  });

  guardarTienda();

  await interaction.reply({ content: `✅ **${nombre}** añadido correctamente.\nStock: ${stock === null ? '∞ (Ilimitado)' : stock}`, flags: MessageFlags.Ephemeral });
}

async function handleBorrarProducto(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores.', flags: MessageFlags.Ephemeral });
  }
  const id = interaction.options.getString('id');
  const guildTienda = getGuildTienda(interaction.guild.id);
  const index = guildTienda.findIndex(p => p.id === id);
  if (index === -1) return interaction.reply({ content: '❌ Producto no encontrado.', flags: MessageFlags.Ephemeral });

  const nombre = guildTienda[index].nombre;
  guildTienda.splice(index, 1);
  guardarTienda();

  await interaction.reply({ content: `🗑️ Producto **${nombre}** eliminado de la tienda.`, flags: MessageFlags.Ephemeral });
}

async function handleActualizarStock(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores.', flags: MessageFlags.Ephemeral });
  }
  const id = interaction.options.getString('id');
  const nuevoStockInput = interaction.options.getInteger('nuevo_stock');
  const nuevoStock = nuevoStockInput === 0 ? null : nuevoStockInput;

  const guildTienda = getGuildTienda(interaction.guild.id);
  const producto = guildTienda.find(p => p.id === id);
  if (!producto) return interaction.reply({ content: '❌ Producto no encontrado.', flags: MessageFlags.Ephemeral });

  producto.stock = nuevoStock;
  guardarTienda();

  await interaction.reply({ content: `✅ Stock de **${producto.nombre}** actualizado a **${nuevoStock === null ? '∞' : nuevoStock}**.`, flags: MessageFlags.Ephemeral });
}

async function handleVerTienda(interaction) {
  const guildTienda = getGuildTienda(interaction.guild.id);
  if (guildTienda.length === 0) return interaction.reply({ content: '🛒 La tienda está vacía.', flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setTitle('🛒 Tienda Albacete RP')
    .setColor(0x00FFAA);

  guildTienda.forEach(p => {
    const stockText = p.stock === null ? '∞ (Ilimitado)' : p.stock;
    embed.addFields({
      name: `${p.emoji} ${p.nombre}`,
      value: `**Precio:** $${p.precio}\n**Stock:** ${stockText}\n${p.descripcion}`,
      inline: false
    });
  });

  await interaction.reply({ embeds: [embed] });
}

async function handlePanelTienda(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores.', flags: MessageFlags.Ephemeral });
  }

  const guildTienda = getGuildTienda(interaction.guild.id);
  if (guildTienda.length === 0) return interaction.reply({ content: 'No hay productos en la tienda.', flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setTitle('🛒 TIENDA OFICIAL ALBACETE RP')
    .setColor(0x00FFAA)
    .setDescription('Selecciona el producto que deseas comprar:');

  const select = new StringSelectMenuBuilder()
    .setCustomId('tienda-select')
    .setPlaceholder('Elige un producto...')
    .addOptions(guildTienda.map(p => {
      const stockText = p.stock === null ? '∞' : p.stock;
      return new StringSelectMenuOptionBuilder()
        .setLabel(p.nombre)
        .setDescription(`$${p.precio} | Stock: ${stockText}`)
        .setValue(p.id)
        .setEmoji(p.emoji);
    }));

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: '✅ Panel de tienda creado.', flags: MessageFlags.Ephemeral });
}

async function handleTiendaSelect(interaction) {
  const guildTienda = getGuildTienda(interaction.guild.id);
  const producto = guildTienda.find(p => p.id === interaction.values[0]);
  if (!producto) return interaction.reply({ content: '❌ Producto no encontrado.', flags: MessageFlags.Ephemeral });
  if (producto.stock !== null && producto.stock <= 0) return interaction.reply({ content: '❌ Este producto está agotado.', flags: MessageFlags.Ephemeral });

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < producto.precio) {
    return interaction.reply({ content: `❌ No tienes suficiente dinero.`, flags: MessageFlags.Ephemeral });
  }

  userData.dinero -= producto.precio;
  if (producto.stock !== null) producto.stock--;
  userData.purchases.push({
    nombre: producto.nombre,
    precio: producto.precio,
    fecha: new Date().toLocaleString('es-ES')
  });

  guardarTienda();
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('✅ ¡Compra realizada!')
    .setDescription(`Has comprado **${producto.nombre}**`)
    .setColor(0x00FF88)
    .addFields({ name: 'Precio', value: `**$${producto.precio}**`, inline: true }, { name: 'Balance restante', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: true });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleComprar(interaction) {
  const id = interaction.options.getString('id');
  const guildTienda = getGuildTienda(interaction.guild.id);
  const producto = guildTienda.find(p => p.id === id);
  if (!producto) return interaction.reply({ content: '❌ Producto no encontrado.', flags: MessageFlags.Ephemeral });
  if (producto.stock !== null && producto.stock <= 0) return interaction.reply({ content: '❌ Este producto está agotado.', flags: MessageFlags.Ephemeral });

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < producto.precio) {
    return interaction.reply({ content: `❌ No tienes suficiente dinero. Necesitas **$${producto.precio}**.`, flags: MessageFlags.Ephemeral });
  }

  userData.dinero -= producto.precio;
  if (producto.stock !== null) producto.stock--;
  userData.purchases.push({
    nombre: producto.nombre,
    precio: producto.precio,
    fecha: new Date().toLocaleString('es-ES')
  });

  guardarTienda();
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('✅ Compra Exitosa')
    .setDescription(`Has comprado **${producto.nombre}**`)
    .setColor(0x00FF88)
    .addFields({ name: 'Precio', value: `**$${producto.precio}**`, inline: true }, { name: 'Balance actual', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: true });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleInventario(interaction) {
  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.purchases.length === 0) {
    return interaction.reply({ content: '🎒 Aún no has comprado nada en la tienda.', flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎒 Tu Inventario - ${interaction.user.tag}`)
    .setColor(0xFFD700);

  userData.purchases.forEach((p, i) => {
    embed.addFields({
      name: `#${i + 1} ${p.nombre}`,
      value: `**$${p.precio}** • ${p.fecha}`,
      inline: false
    });
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleClearTienda(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores.', flags: MessageFlags.Ephemeral });
  }
  const guildTienda = getGuildTienda(interaction.guild.id);
  const cantidad = guildTienda.length;
  guildTienda.length = 0;
  guardarTienda();
  await interaction.reply({ content: `🗑️ Se han eliminado **${cantidad}** productos de la tienda.` });
}

// ======================
// LOGIN DEL BOT
// ======================
client.login(process.env.TOKEN)
  .then(() => {
    console.log(`🚀 Bot Albacete RP conectado correctamente como ${client.user.tag}`);
  })
  .catch(err => console.error('❌ Error al iniciar sesión:', err));
