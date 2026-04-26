// ======================
// BOT DE GESTIÓN ALBACETE RP - CÓDIGO FINAL FUSIONADO 100%
// ======================
require('dotenv').config();

// ======================
// SERVIDOR HTTP PARA RENDER
// ======================
const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.send('✅ Bot de Discord está vivo y funcionando en Render');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP corriendo en puerto ${PORT}`);
});

// ======================
// IMPORTS DE DISCORD.JS Y NODE
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
const crypto = require('crypto');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages
  ]
});

// ======================
// MEJORA: GUARDADO AUTOMÁTICO AL APAGAR EL BOT
// ======================
function guardarTodo() {
  guardarIdentidades();
  guardarTienda();
  guardarSubastas();
  guardarPrestamos();
  guardarSanciones();
  guardarLoteria();
  console.log('💾 Todos los datos guardados correctamente antes de cerrar.');
}

process.on('SIGTERM', () => {
  console.log('⚠️ Recibida señal SIGTERM (Render va a apagar el bot). Guardando datos...');
  guardarTodo();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️ Recibida señal SIGINT (Ctrl+C). Guardando datos...');
  guardarTodo();
  process.exit(0);
});

process.on('exit', () => {
  console.log('⚠️ Bot cerrando. Guardando todos los datos...');
  guardarTodo();
});

// ======================
// CONFIGURACIÓN DE CANALES
// ======================
const DNI_CHANNEL_ID = '1466563810784444478';
const CARNET_CHANNEL_ID = '1457570708497371332';
const LICENCIA_CHANNEL_ID = '1493631768169939136';

// ======================
// ROLES AUTORIZADOS PARA POLICÍA
// ======================
const POLICE_ROLES = [
  '1457537988132343858',
  '1457538324578439396',
  '1467525875007230055'
];

// ======================
// SISTEMA DE SANCIONES
// ======================
const SANCTIONS_FILE = path.join(__dirname, 'sanciones.json');
let sanciones = {};

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

// ======================
// ARCHIVOS PARA TIENDA, SUBASTAS Y PRÉSTAMOS
// ======================
const TIENDA_FILE = path.join(__dirname, 'tienda.json');
const SUBASTAS_FILE = path.join(__dirname, 'subastas.json');
const PRESTAMOS_FILE = path.join(__dirname, 'prestamos.json');

let tiendaItems = [];
let subastasGlobal = [];
let prestamosGlobal = [];

function cargarTienda() {
  if (fs.existsSync(TIENDA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TIENDA_FILE, 'utf-8'));
      tiendaItems = Array.isArray(data) ? data : [];
      console.log(`✅ Tienda cargada correctamente (${tiendaItems.length} artículos).`);
    } catch (error) {
      console.error('❌ Error al cargar tienda.json (archivo corrupto). Se reinicia.', error.message);
      tiendaItems = [];
      fs.writeFileSync(TIENDA_FILE, JSON.stringify([], null, 4));
    }
  } else {
    tiendaItems = [];
    fs.writeFileSync(TIENDA_FILE, JSON.stringify([], null, 4));
    console.log('ℹ️ Archivo tienda.json creado (estaba vacío).');
  }
}

function guardarTienda() {
  try {
    fs.writeFileSync(TIENDA_FILE, JSON.stringify(tiendaItems, null, 4), 'utf-8');
  } catch (error) {
    console.error('❌ Error al guardar tienda:', error.message);
  }
}

function cargarSubastas() {
  if (fs.existsSync(SUBASTAS_FILE)) {
    try {
      subastasGlobal = JSON.parse(fs.readFileSync(SUBASTAS_FILE, 'utf-8'));
      console.log('✅ Subastas cargadas correctamente.');
    } catch (error) {
      console.error('❌ Error al cargar subastas:', error.message);
      subastasGlobal = [];
    }
  } else {
    subastasGlobal = [];
    fs.writeFileSync(SUBASTAS_FILE, JSON.stringify([], null, 4));
    console.log('ℹ️ Archivo subastas.json creado.');
  }
}

function guardarSubastas() {
  try {
    fs.writeFileSync(SUBASTAS_FILE, JSON.stringify(subastasGlobal, null, 4), 'utf-8');
  } catch (error) {
    console.error('❌ Error al guardar subastas:', error.message);
  }
}

function cargarPrestamos() {
  if (fs.existsSync(PRESTAMOS_FILE)) {
    try {
      prestamosGlobal = JSON.parse(fs.readFileSync(PRESTAMOS_FILE, 'utf-8'));
      console.log('✅ Préstamos cargados correctamente.');
    } catch (error) {
      console.error('❌ Error al cargar préstamos:', error.message);
      prestamosGlobal = [];
    }
  } else {
    prestamosGlobal = [];
    fs.writeFileSync(PRESTAMOS_FILE, JSON.stringify([], null, 4));
    console.log('ℹ️ Archivo prestamos.json creado.');
  }
}

function guardarPrestamos() {
  try {
    fs.writeFileSync(PRESTAMOS_FILE, JSON.stringify(prestamosGlobal, null, 4), 'utf-8');
  } catch (error) {
    console.error('❌ Error al guardar préstamos:', error.message);
  }
}

// ======================
// SISTEMA DE LOTERÍA
// ======================
const LOTERIA_FILE = path.join(__dirname, 'loteria.json');
let loteriaData = {
  jackpot: 10000,
  tickets: {},
  nextDraw: null,
  currentDrawId: 1,
  history: []
};

const TICKET_PRICE = 500;
const DRAW_INTERVAL_MS = 6 * 60 * 60 * 1000;

function cargarLoteria() {
  if (fs.existsSync(LOTERIA_FILE)) {
    try {
      loteriaData = JSON.parse(fs.readFileSync(LOTERIA_FILE, 'utf-8'));
      console.log('✅ Lotería cargada correctamente.');
    } catch (error) {
      console.error('❌ Error al cargar lotería:', error.message);
      loteriaData = { jackpot: 10000, tickets: {}, nextDraw: null, currentDrawId: 1, history: [] };
    }
  } else {
    fs.writeFileSync(LOTERIA_FILE, JSON.stringify(loteriaData, null, 4));
    console.log('ℹ️ Archivo loteria.json creado.');
  }
}

function guardarLoteria() {
  try {
    fs.writeFileSync(LOTERIA_FILE, JSON.stringify(loteriaData, null, 4), 'utf-8');
  } catch (error) {
    console.error('❌ Error al guardar lotería:', error.message);
  }
}

// ======================
// UTILIDADES
// ======================
function generarIDCorto(prefijo) {
  // Genera un ID corto de 4 números. Ej: SUB-4921 o PRE-1029
  return `${prefijo}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// ======================
// SISTEMA DE VOTACIONES
// ======================
const votes = new Map();

function createProgressBar(votosQueCuentan, maximo = 5) {
  const porcentaje = Math.min(Math.round((votosQueCuentan / maximo) * 100), 100);
  const segmentos = Math.round(10 * (votosQueCuentan / maximo));
  const barra = '█'.repeat(segmentos) + '░'.repeat(10 - segmentos);
  return votosQueCuentan >= maximo ? `✅ **COMPLETADO** (${porcentaje}%)` : `${barra} **${porcentaje}%**`;
}

function getVoterList(pollData, type) {
  const list = [];
  for (const [userId, opcion] of pollData.voters.entries()) {
    if (opcion === type) {
      const name = pollData.voterNames.get(userId) || 'Usuario desconocido';
      list.push(name);
    }
  }
  return list.length > 0 ? list.join(', ') : 'Nadie';
}

// ======================
// SISTEMA DE ECONOMÍA
// ======================
const SALARY_BASE = 1500;
const ROLE_BONUSES = {
  '1467525875007230055': 1000,
  '1457538526173462670': 1000,
  '1457538324578439396': 1000,
  '1457537988132343858': 1000,
  '1457537819814789242': 800,
  '1457537536019665017': 1000,
  '1457537243714420797': 1000,
  '1457536868630532328': 1000,
  '1464767715083550966': -250,
};

let serverAbierto = false;
let ultimaApertura = null;

// ======================
// SISTEMA DE IDENTIDADES (DINERO SE GUARDA SIEMPRE)
// ======================
const IDENTIDADES_FILE = path.join(__dirname, 'identidades.json');
let identidades = {};

function cargarIdentidades() {
  if (fs.existsSync(IDENTIDADES_FILE)) {
    try {
      identidades = JSON.parse(fs.readFileSync(IDENTIDADES_FILE, 'utf-8'));
      console.log('✅ Identidades (DNI + Economía) cargadas correctamente.');
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
      lastSalary: null,
      drogas: { marihuana: 0, cocaina: 0 } // AÑADIDO PARA IDEA E
    };
  } else {
    if (typeof identidades[guildId][userId].dinero !== 'number') identidades[guildId][userId].dinero = 6000;
    if (!identidades[guildId][userId].lastSalary) identidades[guildId][userId].lastSalary = null;
    if (!identidades[guildId][userId].drogas) identidades[guildId][userId].drogas = { marihuana: 0, cocaina: 0 }; // AÑADIDO
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
  cargarTienda();
  cargarSubastas();
  cargarPrestamos();
  cargarLoteria();
  scheduleNextDraw();

  // Restaurar timers de subastas pendientes
  const ahora = Date.now();
  subastasGlobal.forEach(sub => {
    if (!sub.ended && sub.endTime > ahora) {
      setTimeout(() => finalizarSubasta(sub.id, client), sub.endTime - ahora);
    } else if (!sub.ended) {
      finalizarSubasta(sub.id, client);
    }
  });

  const commands = [
    // COMANDOS ORIGINALES
    new SlashCommandBuilder().setName('ping').setDescription('Ver latencia del bot'),
    new SlashCommandBuilder().setName('votacion').setDescription('Crea votación de apertura de servidor (30 minutos)'),
    new SlashCommandBuilder().setName('abrirserver').setDescription('Abre el servidor manualmente'),
    new SlashCommandBuilder().setName('cerrarserver').setDescription('Cierra el servidor'),
    new SlashCommandBuilder().setName('cancelarvotacion').setDescription('Cancela la votación activa en este canal'),
    new SlashCommandBuilder().setName('sancionar').setDescription('Registra una sanción').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a sancionar').setRequired(true)).addStringOption(opt => opt.setName('gravedad').setDescription('Tipo de sanción').setRequired(true).addChoices({ name: '⚠️ Aviso', value: 'aviso' }, { name: '📝 Falta Leve', value: 'leve' }, { name: '⚠️ Falta Moderada', value: 'moderada' }, { name: '🚨 Falta Grave', value: 'grave' })).addStringOption(opt => opt.setName('razon').setDescription('Razón de la sanción').setRequired(false)),
    new SlashCommandBuilder().setName('sanciones').setDescription('Ver todas las sanciones del servidor'),
    new SlashCommandBuilder().setName('sanciones_usuario').setDescription('Ver sanciones de un usuario').addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true)),
    new SlashCommandBuilder().setName('eliminarsancion').setDescription('Eliminar una sanción por ID').addIntegerOption(opt => opt.setName('id').setDescription('ID de la sanción').setRequired(true)),
    new SlashCommandBuilder().setName('panel-dni').setDescription('Crea el panel oficial del sistema de DNI'),
    new SlashCommandBuilder().setName('borrar-dni-admin').setDescription('🔧 [ADMIN] Borra el DNI y todos los documentos de un usuario').addUserOption(opt => opt.setName('usuario').setDescription('Usuario al que borrar DNI').setRequired(true)).addStringOption(opt => opt.setName('pj').setDescription('PJ 1 o 2').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    new SlashCommandBuilder().setName('ver-dni-admin').setDescription('🔧 [ADMIN] Ver DNI de cualquier usuario').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(true)).addStringOption(opt => opt.setName('pj').setDescription('PJ 1 o 2').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    new SlashCommandBuilder().setName('buscar-dni').setDescription('🔍 Busca el DNI de cualquier usuario (Policía/Staff)').addUserOption(opt => opt.setName('usuario').setDescription('Usuario a buscar').setRequired(true)).addStringOption(opt => opt.setName('pj').setDescription('PJ 1 o 2').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    new SlashCommandBuilder().setName('multa').setDescription('💰 Registra una multa (SIN añadir a sanciones)').addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true)).addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de la multa').setRequired(true)).addStringOption(opt => opt.setName('razon').setDescription('Razón de la multa').setRequired(true)),
    new SlashCommandBuilder().setName('anuncio-rp').setDescription('📢 Crea un anuncio RP bonito').addStringOption(opt => opt.setName('titulo').setDescription('Título del anuncio').setRequired(true)).addStringOption(opt => opt.setName('descripcion').setDescription('Texto del anuncio').setRequired(true)).addStringOption(opt => opt.setName('color').setDescription('Color del embed').addChoices({ name: '🔴 Rojo', value: '#FF0000' }, { name: '🔵 Azul', value: '#00AAFF' }, { name: '🟢 Verde', value: '#00FF88' }, { name: '🟡 Amarillo', value: '#FFEE00' })),
    new SlashCommandBuilder().setName('estado-server').setDescription('📡 Muestra si el servidor está abierto o cerrado'),
    new SlashCommandBuilder().setName('arrestar').setDescription('🚔 Realizar un arresto (solo Policía)'),
    new SlashCommandBuilder().setName('ver-dni').setDescription('🔍 Ver DNI de cualquier usuario (público)').addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setDescription('PJ 1 o 2').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    new SlashCommandBuilder().setName('balance').setDescription('💰 Ver tu dinero o el de otro usuario').addUserOption(opt => opt.setName('usuario').setDescription('Usuario (opcional)')),
    new SlashCommandBuilder().setName('addmoney').setDescription('🔧 [ADMIN] Añadir o quitar dinero').addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true)).addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad (positiva = añadir, negativa = quitar)').setRequired(true)),
    new SlashCommandBuilder().setName('sueldo').setDescription('💼 Cobrar sueldo (cada 24 horas)'),
    new SlashCommandBuilder().setName('transferir').setDescription('💸 Transferir dinero a otro usuario').addUserOption(opt => opt.setName('usuario').setDescription('Destinatario').setRequired(true)).addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad a transferir').setRequired(true)),
    new SlashCommandBuilder().setName('apostar').setDescription('🎲 Apostar en cara o cruz (50/50)').addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad a apostar (mín. 100)').setRequired(true)).addStringOption(opt => opt.setName('opcion').setDescription('Cara o Cruz').setRequired(true).addChoices({ name: '🪙 Cara', value: 'cara' }, { name: '🪙 Cruz', value: 'cruz' })),
    new SlashCommandBuilder().setName('leaderboard').setDescription('🏆 Top 10 más ricos del servidor'),

    // COMANDOS DE LOTERÍA
    new SlashCommandBuilder().setName('loteria-comprar').setDescription('🎟️ Comprar boletos de lotería').addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de boletos (mín. 1)').setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName('loteria').setDescription('🎟️ Ver información del sorteo actual'),
    new SlashCommandBuilder().setName('loteria-historial').setDescription('🏆 Ver ganadores anteriores de la lotería'),

    // COMANDOS TIENDA, SUBASTAS, PRÉSTAMOS Y RULETA
    new SlashCommandBuilder().setName('paneltienda').setDescription('🔧 [ADMIN] Panel de administración de la tienda'),
    new SlashCommandBuilder().setName('tienda').setDescription('🛒 Ver la tienda del servidor'),
    new SlashCommandBuilder().setName('añadirarticulo').setDescription('🔧 [ADMIN] Añadir artículo a la tienda').addStringOption(opt => opt.setName('nombre').setDescription('Nombre del artículo').setRequired(true)).addIntegerOption(opt => opt.setName('precio').setDescription('Precio en $').setRequired(true)).addIntegerOption(opt => opt.setName('stock').setDescription('Stock inicial').setRequired(true)).addStringOption(opt => opt.setName('descripcion').setDescription('Descripción').setRequired(true)),
    new SlashCommandBuilder().setName('añadirstock').setDescription('🔧 [ADMIN] Añadir stock a un artículo').addStringOption(opt => opt.setName('id').setDescription('ID del artículo').setRequired(true)).addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad a añadir').setRequired(true)),
    new SlashCommandBuilder().setName('comprar').setDescription('🛒 Comprar un artículo de la tienda').addStringOption(opt => opt.setName('id').setDescription('ID del artículo').setRequired(true)).addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad (por defecto 1)').setRequired(false)),
    new SlashCommandBuilder().setName('ruleta').setDescription('🎰 Jugar a la ruleta').addIntegerOption(opt => opt.setName('apuesta').setDescription('Cantidad a apostar (mín. 10)').setRequired(true)).addStringOption(opt => opt.setName('opcion').setDescription('Color').setRequired(true).addChoices({ name: '🔴 Rojo', value: 'rojo' }, { name: '⚫ Negro', value: 'negro' }, { name: '🟢 Verde', value: 'verde' })),
    new SlashCommandBuilder().setName('subastar').setDescription('🛒 Crear una subasta').addStringOption(opt => opt.setName('item').setDescription('Artículo a subastar').setRequired(true)).addIntegerOption(opt => opt.setName('preciomin').setDescription('Puja mínima').setRequired(true)).addIntegerOption(opt => opt.setName('duracion').setDescription('Duración en horas').setRequired(true)),
    new SlashCommandBuilder().setName('pujar').setDescription('🛒 Pujar en una subasta').addStringOption(opt => opt.setName('id').setDescription('ID de la subasta').setRequired(true)).addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de la puja').setRequired(true)),
    new SlashCommandBuilder().setName('solicitarprestamo').setDescription('💰 Solicitar un préstamo (interés 25%)').addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad (máx. 50,000)').setRequired(true).setMaxValue(50000)).addStringOption(opt => opt.setName('razon').setDescription('Razón del préstamo').setRequired(true)),
    new SlashCommandBuilder().setName('prestamos').setDescription('💳 Ver tus préstamos activos'),
    new SlashCommandBuilder().setName('pagarprestamo').setDescription('💳 Pagar un préstamo').addStringOption(opt => opt.setName('id').setDescription('ID del préstamo').setRequired(true)),
    new SlashCommandBuilder().setName('quitararticulo').setDescription('🔧 [ADMIN] Eliminar un artículo de la tienda').addStringOption(opt => opt.setName('id').setDescription('ID del artículo').setRequired(true)),
    new SlashCommandBuilder().setName('crearitemsubasta').setDescription('🔧 [ADMIN] Crear artículo directamente para subasta (no va a la tienda)').addStringOption(opt => opt.setName('nombre').setDescription('Nombre del artículo').setRequired(true)).addIntegerOption(opt => opt.setName('preciomin').setDescription('Precio mínimo de puja').setRequired(true)).addIntegerOption(opt => opt.setName('duracion').setDescription('Duración en horas (1-48)').setRequired(true)).addStringOption(opt => opt.setName('descripcion').setDescription('Descripción').setRequired(true)),
    // NUEVOS COMANDOS POLICÍA (suspensión y ver documentos)
    new SlashCommandBuilder().setName('suspender-carnet').setDescription('🚔 [Policía] Suspender carnet de conducir').addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setDescription('PJ 1 o 2').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })).addIntegerOption(opt => opt.setName('horas').setDescription('Horas de suspensión (1-720)').setRequired(true).setMinValue(1).setMaxValue(720)),
    new SlashCommandBuilder().setName('suspender-licencia').setDescription('🚔 [Policía] Suspender licencia de armas').addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setDescription('PJ 1 o 2').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })).addIntegerOption(opt => opt.setName('horas').setDescription('Horas de suspensión (1-720)').setRequired(true).setMinValue(1).setMaxValue(720)),
    new SlashCommandBuilder().setName('ver-carnet-policia').setDescription('🔍 [Policía] Ver carnet de conducir de cualquier usuario').addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setDescription('PJ 1 o 2').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    new SlashCommandBuilder().setName('ver-licencia-policia').setDescription('🔍 [Policía] Ver licencia de armas de cualquier usuario').addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setDescription('PJ 1 o 2').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    // Lista de morosos para el banco (Idea A)
    new SlashCommandBuilder().setName('morosos').setDescription('🏦 [Banco] Ver lista de personas con préstamos vencidos'),
    // Comandos de drogas (Idea E)
    new SlashCommandBuilder().setName('procesar').setDescription('🌿 Procesar sustancias ilegales').addStringOption(opt => opt.setName('tipo').setDescription('Tipo de sustancia').setRequired(true).addChoices({ name: '🌿 Marihuana', value: 'marihuana' }, { name: '❄️ Cocaína', value: 'cocaina' })),
    new SlashCommandBuilder().setName('vender-ilegal').setDescription('🕴️ Vender sustancias en el mercado negro').addStringOption(opt => opt.setName('tipo').setDescription('Tipo de sustancia a vender').setRequired(true).addChoices({ name: '🌿 Marihuana', value: 'marihuana' }, { name: '❄️ Cocaína', value: 'cocaina' })),
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
// INTERACCIONES (SWITCH COMPLETO)
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
        case 'sancionar': await handleSancionar(interaction); break;
        case 'sanciones': await handleVerSanciones(interaction); break;
        case 'sanciones_usuario': await handleVerSancionesUsuario(interaction); break;
        case 'eliminarsancion': await handleEliminarSancion(interaction); break;
        case 'panel-dni': await handlePanelDni(interaction); break;
        case 'borrar-dni-admin': await handleBorrarDniAdmin(interaction); break;
        case 'ver-dni-admin': await handleVerDniAdmin(interaction); break;
        case 'buscar-dni': await handleBuscarDni(interaction); break;
        case 'multa': await handleMulta(interaction); break;
        case 'anuncio-rp': await handleAnuncioRp(interaction); break;
        case 'estado-server': await handleEstadoServer(interaction); break;
        case 'arrestar': await handleArrestar(interaction); break;
        case 'ver-dni': await handleVerDniPublico(interaction); break;
        case 'balance': await handleBalance(interaction); break;
        case 'addmoney': await handleAddMoney(interaction); break;
        case 'sueldo': await handleSueldo(interaction); break;
        case 'transferir': await handleTransferir(interaction); break;
        case 'apostar': await handleApostar(interaction); break;
        case 'leaderboard': await handleLeaderboard(interaction); break;
        

        // COMANDOS DE LOTERÍA
        case 'loteria-comprar': await handleLoteriaComprar(interaction); break;
        case 'loteria': await handleLoteria(interaction); break;
        case 'loteria-historial': await handleLoteriaHistorial(interaction); break;

        // COMANDOS TIENDA Y ECONOMÍA AVANZADA
        case 'paneltienda': await handlePanelTienda(interaction); break;
        case 'tienda': await handleTienda(interaction); break;
        case 'añadirarticulo': await handleAñadirArticulo(interaction); break;
        case 'añadirstock': await handleAñadirStock(interaction); break;
        case 'comprar': await handleComprar(interaction); break;
        case 'ruleta': await handleRuleta(interaction); break;
        case 'subastar': await handleSubastar(interaction); break;
        case 'pujar': await handlePujar(interaction); break;
        case 'solicitarprestamo': await handleSolicitarPrestamo(interaction); break;
        case 'prestamos': await handlePrestamos(interaction); break;
        case 'pagarprestamo': await handlePagarPrestamo(interaction); break;
        case 'quitararticulo': await handleQuitarArticulo(interaction); break;
        case 'crearitemsubasta': await handleCrearItemSubasta(interaction); break;

        // NUEVOS COMANDOS POLICÍA
        case 'suspender-carnet': await handleSuspenderCarnet(interaction); break;
        case 'suspender-licencia': await handleSuspenderLicencia(interaction); break;
        case 'ver-carnet-policia': await handleVerCarnetPolicia(interaction); break;
        case 'ver-licencia-policia': await handleVerLicenciaPolicia(interaction); break;
          case 'morosos': await handleMorosos(interaction); break;
        case 'procesar': await handleProcesar(interaction); break;
        case 'vender-ilegal': await handleVenderIlegal(interaction); break;
      }
      return;
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId.startsWith('dni-') || customId.startsWith('carnet-') || customId.startsWith('licencia-')) {
        await handleDniButton(interaction);
      } else if (['panel_add_item', 'panel_add_stock', 'panel_view_items'].includes(customId)) {
        await handlePanelTiendaButton(interaction);
      } else if (customId.startsWith('prestamo_')) { // ESTO ES NUEVO
        await handlePrestamoButton(interaction);
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
// COMANDOS DE TIENDA
// ======================
async function handleTienda(interaction) {
  try {
    if (!Array.isArray(tiendaItems)) tiendaItems = [];
    if (tiendaItems.length === 0) {
      return interaction.reply({ content: '🛒 La tienda está vacía en este momento.\n\nUsa `/paneltienda` (solo admins) para añadir artículos.', flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 TIENDA DEL SERVIDOR ALBACETE RP')
      .setColor('#7289da')
      .setDescription('Artículos disponibles:');

    tiendaItems.forEach(item => {
      embed.addFields({
        name: `**${item.nombre || 'Sin nombre'}** (${item.id || 'SIN-ID'})`,
        value: `💰 **$${Number(item.precio || 0).toLocaleString('es-ES')}** | 📦 Stock: **${Number(item.stock || 0)}**\n${item.descripcion || 'Sin descripción'}`,
        inline: false
      });
    });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('❌ Error en handleTienda:', error);
    await interaction.reply({ content: '❌ Error interno al mostrar la tienda.', flags: MessageFlags.Ephemeral });
  }
}

async function handleAñadirArticulo(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores pueden añadir artículos.', flags: MessageFlags.Ephemeral });
  }
  const nombre = interaction.options.getString('nombre');
  const precio = interaction.options.getInteger('precio');
  const stock = interaction.options.getInteger('stock');
  const descripcion = interaction.options.getString('descripcion');
  const id = generarIDCorto('ART');
  tiendaItems.push({ id, nombre, precio, stock, descripcion });
  guardarTienda();
  const embed = new EmbedBuilder()
    .setTitle('✅ Artículo añadido a la tienda')
    .setColor(0x00FF88)
    .addFields(
      { name: 'ID', value: id, inline: true },
      { name: 'Nombre', value: nombre, inline: true },
      { name: 'Precio', value: `$${precio.toLocaleString('es-ES')}`, inline: true },
      { name: 'Stock inicial', value: stock.toString(), inline: true },
      { name: 'Descripción', value: descripcion, inline: false }
    );
  await interaction.reply({ embeds: [embed] });
}

async function handleAñadirStock(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores pueden añadir stock.', flags: MessageFlags.Ephemeral });
  }
  const id = interaction.options.getString('id');
  const cantidad = interaction.options.getInteger('cantidad');
  const item = tiendaItems.find(i => i.id === id);
  if (!item) {
    return interaction.reply({ content: `❌ No se encontró el artículo con ID **${id}**.`, flags: MessageFlags.Ephemeral });
  }
  item.stock += cantidad;
  guardarTienda();
  await interaction.reply({ content: `✅ Stock actualizado. **${item.nombre}** ahora tiene **${item.stock}** unidades.` });
}

async function handleComprar(interaction) {
  const id = interaction.options.getString('id');
  let cantidad = interaction.options.getInteger('cantidad') || 1;
  const item = tiendaItems.find(i => i.id === id);
  if (!item) return interaction.reply({ content: '❌ Artículo no encontrado.', flags: MessageFlags.Ephemeral });
  if (item.stock < cantidad) return interaction.reply({ content: `❌ Solo quedan **${item.stock}** unidades.`, flags: MessageFlags.Ephemeral });

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  const total = item.precio * cantidad;
  if (userData.dinero < total) return interaction.reply({ content: `❌ No tienes suficiente dinero (necesitas **$${total.toLocaleString('es-ES')}**).`, flags: MessageFlags.Ephemeral });

  userData.dinero -= total;
  item.stock -= cantidad;
  guardarTienda();
  guardarIdentidades();

  await interaction.reply({
    content: `✅ **¡Compra realizada!**\nHas comprado **${cantidad}× ${item.nombre}** por **$${total.toLocaleString('es-ES')}**.\nNuevo balance: **$${userData.dinero.toLocaleString('es-ES')}**`
  });
}
async function handleQuitarArticulo(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores pueden quitar artículos.', flags: MessageFlags.Ephemeral });
  }

  const id = interaction.options.getString('id');
  const index = tiendaItems.findIndex(i => i.id === id);

  if (index === -1) {
    return interaction.reply({ content: `❌ No existe ningún artículo con ID **${id}**.`, flags: MessageFlags.Ephemeral });
  }

  const nombre = tiendaItems[index].nombre;
  tiendaItems.splice(index, 1);
  guardarTienda();

  await interaction.reply({ content: `✅ Artículo **${nombre}** (${id}) eliminado de la tienda.` });
}
async function handleRuleta(interaction) {
  const apuesta = interaction.options.getInteger('apuesta');
  const opcion = interaction.options.getString('opcion');
  if (apuesta < 10) return interaction.reply({ content: '❌ La apuesta mínima es $10.', flags: MessageFlags.Ephemeral });

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < apuesta) return interaction.reply({ content: '❌ No tienes suficiente dinero.', flags: MessageFlags.Ephemeral });

  const random = Math.random() * 100;
  let resultado = random < 48.65 ? 'rojo' : random < 97.3 ? 'negro' : 'verde';
  let ganancia = 0;

  if (opcion === resultado) {
    ganancia = resultado === 'verde' ? apuesta * 35 : apuesta * 2;
    userData.dinero += ganancia - apuesta;
    guardarIdentidades();
    await interaction.reply({ content: `🎰 **¡GANASTE!** Salió **${resultado.toUpperCase()}**\nGanancia: **+$${(ganancia - apuesta).toLocaleString('es-ES')}**\nNuevo balance: **$${userData.dinero.toLocaleString('es-ES')}**` });
  } else {
    userData.dinero -= apuesta;
    guardarIdentidades();
    await interaction.reply({ content: `🎰 **Perdiste...** Salió **${resultado.toUpperCase()}**\nPerdiste: **-$${apuesta.toLocaleString('es-ES')}**\nNuevo balance: **$${userData.dinero.toLocaleString('es-ES')}**` });
  }
}

// ======================
// COMANDOS DE SUBASTAS
// ======================
async function handleSubastar(interaction) {
  const item = interaction.options.getString('item');
  const preciomin = interaction.options.getInteger('preciomin');
  const duracion = interaction.options.getInteger('duracion');
  if (duracion < 1 || duracion > 48) return interaction.reply({ content: '❌ La duración debe estar entre 1 y 48 horas.', flags: MessageFlags.Ephemeral });

  const subastaId = generarIDCorto('SUB');
  const subasta = {
    id: subastaId,
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    sellerId: interaction.user.id,
    item: item,
    currentBid: preciomin,
    currentBidder: null,
    endTime: Date.now() + duracion * 3600000,
    ended: false
  };

  subastasGlobal.push(subasta);
  guardarSubastas();
  setTimeout(() => finalizarSubasta(subastaId, client), subasta.endTime - Date.now());

  const embed = new EmbedBuilder()
    .setTitle(`🛒 NUEVA SUBASTA - ${subastaId}`)
    .setDescription(`**Artículo:** ${item}\n**Puja mínima:** $${preciomin.toLocaleString('es-ES')}\n**Duración:** ${duracion} horas\n**Vendedor:** ${interaction.user}`)
    .setColor('#FFAA00')
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

async function handlePujar(interaction) {
  const id = interaction.options.getString('id');
  const cantidad = interaction.options.getInteger('cantidad');
  const subasta = subastasGlobal.find(s => s.id === id && !s.ended);
  if (!subasta) return interaction.reply({ content: '❌ Subasta no encontrada o ya finalizada.', flags: MessageFlags.Ephemeral });
  if (cantidad <= subasta.currentBid) return interaction.reply({ content: `❌ La puja debe ser mayor a la actual (**$${subasta.currentBid.toLocaleString('es-ES')}**).`, flags: MessageFlags.Ephemeral });

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < cantidad) return interaction.reply({ content: '❌ No tienes suficiente dinero para pujar.', flags: MessageFlags.Ephemeral });

  if (subasta.currentBidder) {
    const prevData = getUserData(interaction.guild.id, subasta.currentBidder);
    prevData.dinero += subasta.currentBid;
  }

  userData.dinero -= cantidad;
  subasta.currentBid = cantidad;
  subasta.currentBidder = interaction.user.id;
  guardarSubastas();
  guardarIdentidades();
  await interaction.reply({ content: `✅ **Puja aceptada** en la subasta **${id}** por **$${cantidad.toLocaleString('es-ES')}**!` });
}

async function finalizarSubasta(subastaId, clientParam) {
  const index = subastasGlobal.findIndex(s => s.id === subastaId);
  if (index === -1 || subastasGlobal[index].ended) return;
  const subasta = subastasGlobal[index];
  subasta.ended = true;
  guardarSubastas();

  const canal = clientParam.channels.cache.get(subasta.channelId);
  if (!canal) return;

  if (!subasta.currentBidder) {
    return canal.send(`🛑 Subasta **${subasta.id}** finalizada sin pujas.`);
  }

  const sellerData = getUserData(subasta.guildId, subasta.sellerId);
  sellerData.dinero += subasta.currentBid;
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle(`🎉 Subasta ${subasta.id} FINALIZADA`)
    .setDescription(`**Ganador:** <@${subasta.currentBidder}>\n**Pagó:** ${subasta.currentBid} $\n**Vendedor:** <@${subasta.sellerId}>\n**Artículo:** ${subasta.item}`);
  canal.send({ embeds: [embed] });
}

// ======================
// COMANDOS DE PRÉSTAMOS
// ======================
async function handleSolicitarPrestamo(interaction) {
  const cantidad = interaction.options.getInteger('cantidad');
  const razon = interaction.options.getString('razon');
  if (cantidad < 100) return interaction.reply({ content: '❌ La cantidad mínima es 100€.', flags: MessageFlags.Ephemeral });

  // IDEA A: SISTEMA DE LISTA NEGRA (MOROSOS)
  const esMoroso = prestamosGlobal.some(p => p.userId === interaction.user.id && p.estado === 'aprobado' && p.fechaLimite < Date.now());
  if (esMoroso) {
      return interaction.reply({ content: '🚨 **ESTÁS EN LA LISTA NEGRA.**\nEl banco te ha denegado la solicitud porque tienes un préstamo vencido sin pagar.', flags: MessageFlags.Ephemeral });
  }

  const id = generarIDCorto('PRE');
  const aPagar = Math.floor(cantidad * 1.25); // 25% de interés

  // Guardar como PENDIENTE. NO se suma el dinero aquí.
  prestamosGlobal.push({
    id, userId: interaction.user.id, guildId: interaction.guild.id,
    cantidadSolicitada: cantidad, aPagar: aPagar,
    razon: razon, estado: 'pendiente', fecha: Date.now()
  });
  guardarPrestamos();

  const embed = new EmbedBuilder()
    .setTitle('🏦 Nueva Solicitud de Préstamo')
    .setColor('#FFFF00')
    .addFields(
      { name: 'Usuario', value: `${interaction.user}`, inline: true },
      { name: 'Cantidad', value: `${cantidad.toLocaleString('es-ES')}€`, inline: true },
      { name: 'A Devolver', value: `${aPagar.toLocaleString('es-ES')}€`, inline: true },
      { name: 'Razón', value: razon, inline: false }
    )
    .setFooter({ text: `ID: ${id} | Solo el rol Encargado puede aprobar` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`prestamo_aprobar_${id}`).setLabel('Aprobar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`prestamo_rechazar_${id}`).setLabel('Rechazar').setStyle(ButtonStyle.Danger)
  );

  await interaction.reply({ content: '✅ Solicitud enviada al banco. Dinero retenido hasta aprobación.', flags: MessageFlags.Ephemeral });
  await interaction.channel.send({ embeds: [embed], components: [row] });
}

async function handlePrestamoButton(interaction) {
  // ID DEL ROL DE ENCARGADOS QUE ME DISTE
  const ENCARGADO_ROL = '1497936257219559455'; 
  
  if (!interaction.member.roles.cache.has(ENCARGADO_ROL) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Solo los Encargados del Banco pueden aprobar préstamos.', flags: MessageFlags.Ephemeral });
  }

  const [, accion, id] = interaction.customId.split('_');
  const prestamo = prestamosGlobal.find(p => p.id === id);

  if (!prestamo || prestamo.estado !== 'pendiente') {
      return interaction.reply({ content: '❌ Este préstamo ya fue procesado.', flags: MessageFlags.Ephemeral });
  }

  if (accion === 'aprobar') {
      prestamo.estado = 'aprobado';
      prestamo.fechaLimite = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 días
      
      // AQUÍ SE DA EL DINERO AL APROBAR
      const userData = getUserData(prestamo.guildId, prestamo.userId);
      userData.dinero += prestamo.cantidadSolicitada;
      guardarIdentidades(); 
      guardarPrestamos();

      const embed = new EmbedBuilder(interaction.message.embeds[0].data)
          .setColor('#00FF00').setTitle('✅ Préstamo Aprobado').addFields({ name: 'Vencimiento', value: `<t:${Math.floor(prestamo.fechaLimite / 1000)}:R>`, inline: false });
      await interaction.update({ embeds: [embed], components: [] });
  } else {
      prestamo.estado = 'rechazado';
      guardarPrestamos();
      const embed = new EmbedBuilder(interaction.message.embeds[0].data).setColor('#FF0000').setTitle('❌ Préstamo Rechazado');
      await interaction.update({ embeds: [embed], components: [] });
  }
}

async function handlePrestamos(interaction) {
  const userPrestamos = prestamosGlobal.filter(p => p.userId === interaction.user.id && p.estado === 'aprobado');
  if (userPrestamos.length === 0) return interaction.reply({ content: '📭 No tienes préstamos activos.', flags: MessageFlags.Ephemeral });
  const embed = new EmbedBuilder().setTitle('💳 Tus préstamos activos').setColor('#FF8800');
  userPrestamos.forEach(p => {
    embed.addFields({ name: `Préstamo ${p.id}`, value: `Solicitado: $${p.cantidadSolicitada}\nA devolver: **$${p.aPagar}**\nVence: <t:${Math.floor(p.fechaLimite/1000)}:R>`, inline: false });
  });
  await interaction.reply({ embeds: [embed] });
}

async function handlePagarPrestamo(interaction) {
  const id = interaction.options.getString('id');
  const prestamo = prestamosGlobal.find(p => p.id === id && p.userId === interaction.user.id && p.estado === 'aprobado');
  if (!prestamo) return interaction.reply({ content: '❌ No tienes ningún préstamo activo con ese ID.', flags: MessageFlags.Ephemeral });
  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < prestamo.aPagar) return interaction.reply({ content: `❌ No tienes suficiente dinero. Necesitas **$${prestamo.aPagar.toLocaleString('es-ES')}**.`, flags: MessageFlags.Ephemeral });
  userData.dinero -= prestamo.aPagar;
  const index = prestamosGlobal.findIndex(p => p.id === id);
  prestamosGlobal.splice(index, 1);
  guardarPrestamos(); guardarIdentidades();
  await interaction.reply({ content: `✅ Préstamo **${id}** pagado correctamente. ¡Gracias!` });
}
// ======================
// PANEL TIENDA Y BOTONES
// ======================
async function handlePanelTienda(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }
  const embed = new EmbedBuilder().setTitle('🛒 Panel de Administración - Tienda').setColor('#7289da').setDescription('Usa los botones de abajo:');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('panel_add_item').setLabel('➕ Añadir Artículo').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('panel_add_stock').setLabel('📦 Añadir Stock').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('panel_view_items').setLabel('📋 Ver Artículos').setStyle(ButtonStyle.Secondary)
  );
  await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

async function handlePanelTiendaButton(interaction) {
  const customId = interaction.customId;
  if (customId === 'panel_add_item') {
    const modal = new ModalBuilder().setCustomId('modal_add_item').setTitle('Nuevo Artículo a la Tienda');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nombre').setLabel('Nombre').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('precio').setLabel('Precio en $').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('stock').setLabel('Stock inicial').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('descripcion').setLabel('Descripción').setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
    await interaction.showModal(modal);
  }
  if (customId === 'panel_add_stock') {
    const modal = new ModalBuilder().setCustomId('modal_add_stock').setTitle('Añadir Stock');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_id').setLabel('ID del artículo').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cantidad').setLabel('Cantidad').setStyle(TextInputStyle.Short).setRequired(true))
    );
    await interaction.showModal(modal);
  }
  if (customId === 'panel_view_items') {
    if (!Array.isArray(tiendaItems)) tiendaItems = [];
    let desc = tiendaItems.map(i => `**${i.nombre || 'Sin nombre'}** (${i.id || 'SIN-ID'}) - 💰 $${Number(i.precio || 0).toLocaleString('es-ES')} | 📦 ${Number(i.stock || 0)}`).join('\n') || 'No hay artículos en la tienda.';
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('📋 Artículos de la Tienda').setDescription(desc).setColor('#7289da')], flags: MessageFlags.Ephemeral });
  }
}

// ======================
// MODALES COMPLETOS (DNI + CARNET + LICENCIA + TIENDA + ARRESTO)
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

      if (pj !== '1' && pj !== '2') return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', flags: MessageFlags.Ephemeral });
      if (userData.pjs[pj].dni) return interaction.reply({ content: `❌ Ya tienes un DNI creado para el PJ${pj}.`, flags: MessageFlags.Ephemeral });
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaNac)) return interaction.reply({ content: '❌ Formato de fecha incorrecto. Usa DD/MM/AAAA', flags: MessageFlags.Ephemeral });

      const [nombre, ...apellidoParts] = nombreCompleto.split(' ');
      const apellido = apellidoParts.join(' ') || 'Sin apellido';
      const dniNumero = Math.floor(10000000 + Math.random() * 90000000).toString();
      const fechaCreacion = new Date().toLocaleDateString('es-ES');

      userData.pjs[pj].dni = { numero: dniNumero, nombre, apellido, fechaNac, nacionalidad, genero, fechaCreacion };
      guardarIdentidades();

      const embed = new EmbedBuilder().setTitle(`✅ DNI Creado - PJ${pj}`).setColor(0x00FFAA).addFields(
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
      if (pj !== '1' && pj !== '2') return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', flags: MessageFlags.Ephemeral });

      const dni = userData.pjs[pj].dni;
      if (!dni) return interaction.reply({ content: `❌ No tienes DNI en el PJ${pj}.`, flags: MessageFlags.Ephemeral });

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
        await interaction.reply({ content: `🗑️ DNI y todos los documentos del PJ${pj} eliminados.`, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // ==================== CARNET DE CONDUCIR (CREAR + VER + BORRAR) ====================
    if (customId.startsWith('modal-carnet-')) {
      const action = customId.split('-')[2];
      const pj = interaction.fields.getTextInputValue('pj').trim();
      if (pj !== '1' && pj !== '2') return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', flags: MessageFlags.Ephemeral });

      const dni = userData.pjs[pj].dni;
      if (!dni) return interaction.reply({ content: `❌ Primero debes crear el DNI del PJ${pj}.`, flags: MessageFlags.Ephemeral });

      if (action === 'crear') {
        if (userData.pjs[pj].carnetConducir) return interaction.reply({ content: `❌ Ya tienes carnet de conducir en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
        const numero = `CC-${Math.floor(1000 + Math.random() * 9000)}`;
        const fecha = new Date().toLocaleDateString('es-ES');
        userData.pjs[pj].carnetConducir = { numero, nombre: dni.nombre, apellido: dni.apellido, fechaEmision: fecha, suspendedUntil: null };
        guardarIdentidades();
        await interaction.reply({ content: `✅ Carnet de Conducir creado para PJ${pj}\n**Número:** ${numero}`, flags: MessageFlags.Ephemeral });
      } 
      else if (action === 'ver') {
        const carnet = userData.pjs[pj].carnetConducir;
        if (!carnet) return interaction.reply({ content: `❌ No tienes carnet de conducir en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
        
        // CORRECCIÓN: Tomar nombre directo del DNI y revisar si está suspendido
        const nombreReal = dni ? `${dni.nombre} ${dni.apellido}` : `${carnet.nombre} ${carnet.apellido}`;
        const suspendido = carnet.suspendedUntil && carnet.suspendedUntil > Date.now() 
            ? `⚠️ **SUSPENDIDO** hasta <t:${Math.floor(carnet.suspendedUntil / 1000)}:R>` 
            : '✅ Válido';

        const embed = new EmbedBuilder()
          .setTitle(`🚗 CARNET DE CONDUCIR - PJ${pj}`)
          .setColor(0x00FF88)
          .addFields(
            { name: 'Número', value: carnet.numero, inline: true },
            { name: 'Nombre', value: nombreReal, inline: true },
            { name: 'Emitido', value: carnet.fechaEmision, inline: true },
            { name: 'Estado', value: suspendido, inline: false } // Añadido
          )
          .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

        const channel = interaction.guild.channels.cache.get(CARNET_CHANNEL_ID);
        if (channel) await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ Carnet enviado al canal de Carnets.`, flags: MessageFlags.Ephemeral });
      }
      else if (action === 'borrar') {
        if (!userData.pjs[pj].carnetConducir) return interaction.reply({ content: `❌ No tienes carnet para borrar en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
        userData.pjs[pj].carnetConducir = null;
        guardarIdentidades();
        await interaction.reply({ content: `🗑️ Carnet de conducir del PJ${pj} eliminado.`, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // ==================== LICENCIA DE ARMAS (CREAR CON COSTE 8000$ + VER + BORRAR) ====================
    if (customId.startsWith('modal-licencia-')) {
      const action = customId.split('-')[2];
      const pj = interaction.fields.getTextInputValue('pj').trim();
      if (pj !== '1' && pj !== '2') return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', flags: MessageFlags.Ephemeral });

      const dni = userData.pjs[pj].dni;
      if (!dni) return interaction.reply({ content: `❌ Primero debes crear el DNI del PJ${pj}.`, flags: MessageFlags.Ephemeral });

      if (action === 'crear') {
        if (userData.pjs[pj].licenciaArmas) return interaction.reply({ content: `❌ Ya tienes licencia de armas en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
        if (userData.dinero < 8000) return interaction.reply({ content: '❌ No tienes suficiente dinero (Licencia cuesta **8000€**).', flags: MessageFlags.Ephemeral });

        userData.dinero -= 8000;
        const numero = `LA-${Math.floor(1000 + Math.random() * 9000)}`;
        const fecha = new Date().toLocaleDateString('es-ES');
        userData.pjs[pj].licenciaArmas = { numero, nombre: dni.nombre, apellido: dni.apellido, fechaEmision: fecha, suspendedUntil: null };
        guardarIdentidades();
        await interaction.reply({ content: `✅ Licencia de Armas creada (pagaste 8000€)\n**Número:** ${numero}\n**Saldo restante:** $${userData.dinero.toLocaleString('es-ES')}`, flags: MessageFlags.Ephemeral });
      } 
      else if (action === 'ver') {
        const licencia = userData.pjs[pj].licenciaArmas;
        if (!licencia) return interaction.reply({ content: `❌ No tienes licencia de armas en el PJ${pj}.`, flags: MessageFlags.Ephemeral });

        // CORRECCIÓN: Tomar nombre directo del DNI y revisar si está suspendido
        const nombreReal = dni ? `${dni.nombre} ${dni.apellido}` : `${licencia.nombre} ${licencia.apellido}`;
        const suspendido = licencia.suspendedUntil && licencia.suspendedUntil > Date.now() 
            ? `⚠️ **SUSPENDIDA** hasta <t:${Math.floor(licencia.suspendedUntil / 1000)}:R>` 
            : '✅ Válida';

        const embed = new EmbedBuilder()
          .setTitle(`🔫 LICENCIA DE ARMAS - PJ${pj}`)
          .setColor(0xFF8800)
          .addFields(
            { name: 'Número', value: licencia.numero, inline: true },
            { name: 'Nombre', value: nombreReal, inline: true },
            { name: 'Emitida', value: licencia.fechaEmision, inline: true },
            { name: 'Estado', value: suspendido, inline: false } // Añadido
          )
          .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

        const channel = interaction.guild.channels.cache.get(LICENCIA_CHANNEL_ID);
        if (channel) await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ Licencia enviada al canal de Licencias.`, flags: MessageFlags.Ephemeral });
      }
      else if (action === 'borrar') {
        if (!userData.pjs[pj].licenciaArmas) return interaction.reply({ content: `❌ No tienes licencia para borrar en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
        userData.pjs[pj].licenciaArmas = null;
        guardarIdentidades();
        await interaction.reply({ content: `🗑️ Licencia de armas del PJ${pj} eliminada.`, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // ==================== MODALES DE TIENDA ====================
    if (customId === 'modal_add_item') { /* tu código actual ya está bien */ }
    if (customId === 'modal_add_stock') { /* tu código actual ya está bien */ }

    // ==================== ARRESTO ====================
    if (customId === 'modal-arrestar') { /* tu código actual ya está bien */ }

  } catch (error) {
    console.error('❌ Error en handleModalSubmit:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Ocurrió un error al procesar el formulario.', flags: MessageFlags.Ephemeral });
    }
  }
}
async function handlePanelTiendaButton(interaction) {
  const customId = interaction.customId;

  if (customId === 'panel_add_item') {
    const modal = new ModalBuilder()
      .setCustomId('modal_add_item')
      .setTitle('Nuevo Artículo a la Tienda');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nombre').setLabel('Nombre').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('precio').setLabel('Precio en $').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('stock').setLabel('Stock inicial').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('descripcion').setLabel('Descripción').setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
    await interaction.showModal(modal);
  }

  if (customId === 'panel_add_stock') {
    const modal = new ModalBuilder()
      .setCustomId('modal_add_stock')
      .setTitle('Añadir Stock');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_id').setLabel('ID del artículo').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cantidad').setLabel('Cantidad').setStyle(TextInputStyle.Short).setRequired(true))
    );
    await interaction.showModal(modal);
  }

  if (customId === 'panel_view_items') {
    if (!Array.isArray(tiendaItems)) tiendaItems = [];
    let desc = tiendaItems.map(i =>
      `**${i.nombre || 'Sin nombre'}** (${i.id || 'SIN-ID'}) - 💰 $${Number(i.precio || 0).toLocaleString('es-ES')} | 📦 ${Number(i.stock || 0)}`
    ).join('\n') || 'No hay artículos en la tienda.';

    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle('📋 Artículos de la Tienda').setDescription(desc).setColor('#7289da')],
      flags: MessageFlags.Ephemeral
    });
  }
}

async function finalizarSubasta(subastaId, clientParam) {
  const index = subastasGlobal.findIndex(s => s.id === subastaId);
  if (index === -1 || subastasGlobal[index].ended) return;

  const subasta = subastasGlobal[index];
  subasta.ended = true;
  guardarSubastas();

  const canal = clientParam.channels.cache.get(subasta.channelId);
  if (!canal) return;

  if (!subasta.currentBidder) {
    return canal.send(`🛑 Subasta **${subasta.id}** finalizada sin pujas.`);
  }

  const sellerData = getUserData(subasta.guildId, subasta.sellerId);
  sellerData.dinero += subasta.currentBid;
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle(`🎉 Subasta ${subasta.id} FINALIZADA`)
    .setDescription(`**Ganador:** <@${subasta.currentBidder}>\n**Pagó:** ${subasta.currentBid} $\n**Vendedor:** <@${subasta.sellerId}>\n**Artículo:** ${subasta.item}`);

  canal.send({ embeds: [embed] });
}

// ======================
// COMANDOS NUEVOS DE POLICÍA (Suspender y Ver documentos)
// ======================
async function handleSuspenderCarnet(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) 
    return interaction.reply({ content: '❌ Solo Policía puede suspender documentos.', flags: MessageFlags.Ephemeral });

  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const horas = interaction.options.getInteger('horas');

  const userData = getUserData(interaction.guild.id, target.id);
  const carnet = userData.pjs[pj].carnetConducir;

  if (!carnet) return interaction.reply({ content: `❌ **${target}** no tiene carnet de conducir en el PJ${pj}.`, flags: MessageFlags.Ephemeral });

  carnet.suspendedUntil = Date.now() + horas * 3600000;
  guardarIdentidades();

  await interaction.reply({ content: `🚔 Carnet de conducir de **${target}** (PJ${pj}) suspendido por **${horas} horas**.` });
}

async function handleSuspenderLicencia(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) 
    return interaction.reply({ content: '❌ Solo Policía puede suspender documentos.', flags: MessageFlags.Ephemeral });

  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const horas = interaction.options.getInteger('horas');

  const userData = getUserData(interaction.guild.id, target.id);
  const licencia = userData.pjs[pj].licenciaArmas;

  if (!licencia) return interaction.reply({ content: `❌ **${target}** no tiene licencia de armas en el PJ${pj}.`, flags: MessageFlags.Ephemeral });

  licencia.suspendedUntil = Date.now() + horas * 3600000;
  guardarIdentidades();

  await interaction.reply({ content: `🚔 Licencia de armas de **${target}** (PJ${pj}) suspendida por **${horas} horas**.` });
}

async function handleVerCarnetPolicia(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) 
    return interaction.reply({ content: '❌ Solo Policía puede ver documentos.', flags: MessageFlags.Ephemeral });

  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const userData = getUserData(interaction.guild.id, target.id);
  const carnet = userData.pjs[pj].carnetConducir;

  if (!carnet) return interaction.reply({ content: `❌ **${target}** no tiene carnet de conducir en el PJ${pj}.`, flags: MessageFlags.Ephemeral });

  const suspendido = carnet.suspendedUntil && carnet.suspendedUntil > Date.now() 
    ? `⚠️ **SUSPENDIDO** hasta <t:${Math.floor(carnet.suspendedUntil / 1000)}:R>` 
    : '✅ Válido';

  const embed = new EmbedBuilder()
    .setTitle(`🚗 CARNET DE CONDUCIR - PJ${pj}`)
    .setColor(0x00FF88)
    .addFields(
      { name: 'Número', value: carnet.numero, inline: true },
      { name: 'Nombre', value: `${carnet.nombre} ${carnet.apellido}`, inline: true },
      { name: 'Emitido', value: carnet.fechaEmision, inline: true },
      { name: 'Estado', value: suspendido, inline: false }
    )
    .setThumbnail(target.user.displayAvatarURL());

  await interaction.reply({ embeds: [embed] });
}

async function handleVerLicenciaPolicia(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) 
    return interaction.reply({ content: '❌ Solo Policía puede ver documentos.', flags: MessageFlags.Ephemeral });

  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const userData = getUserData(interaction.guild.id, target.id);
  const licencia = userData.pjs[pj].licenciaArmas;

  if (!licencia) return interaction.reply({ content: `❌ **${target}** no tiene licencia de armas en el PJ${pj}.`, flags: MessageFlags.Ephemeral });

  const suspendido = licencia.suspendedUntil && licencia.suspendedUntil > Date.now() 
    ? `⚠️ **SUSPENDIDA** hasta <t:${Math.floor(licencia.suspendedUntil / 1000)}:R>` 
    : '✅ Válida';

  const embed = new EmbedBuilder()
    .setTitle(`🔫 LICENCIA DE ARMAS - PJ${pj}`)
    .setColor(0xFF8800)
    .addFields(
      { name: 'Número', value: licencia.numero, inline: true },
      { name: 'Nombre', value: `${licencia.nombre} ${licencia.apellido}`, inline: true },
      { name: 'Emitida', value: licencia.fechaEmision, inline: true },
      { name: 'Estado', value: suspendido, inline: false }
    )
    .setThumbnail(target.user.displayAvatarURL());

  await interaction.reply({ embeds: [embed] });
}


// ======================
// NUEVOS COMANDOS POLICÍA (SUSPENSIONES Y CONSULTAS)
// ======================
async function handleSuspenderCarnet(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) return interaction.reply({ content: '❌ Solo Policía puede suspender documentos.', flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const horas = interaction.options.getInteger('horas');
  const userData = getUserData(interaction.guild.id, target.id);
  const carnet = userData.pjs[pj].carnetConducir;
  if (!carnet) return interaction.reply({ content: `❌ **${target}** no tiene carnet de conducir en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  carnet.suspendedUntil = Date.now() + horas * 3600000;
  guardarIdentidades();
  await interaction.reply({ content: `🚔 Carnet de conducir de **${target}** (PJ${pj}) suspendido por **${horas} horas**.` });
}

async function handleSuspenderLicencia(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) return interaction.reply({ content: '❌ Solo Policía puede suspender documentos.', flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const horas = interaction.options.getInteger('horas');
  const userData = getUserData(interaction.guild.id, target.id);
  const licencia = userData.pjs[pj].licenciaArmas;
  if (!licencia) return interaction.reply({ content: `❌ **${target}** no tiene licencia de armas en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  licencia.suspendedUntil = Date.now() + horas * 3600000;
  guardarIdentidades();
  await interaction.reply({ content: `🚔 Licencia de armas de **${target}** (PJ${pj}) suspendida por **${horas} horas**.` });
}

async function handleVerCarnetPolicia(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) return interaction.reply({ content: '❌ Solo Policía puede ver documentos.', flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const userData = getUserData(interaction.guild.id, target.id);
  const carnet = userData.pjs[pj].carnetConducir;
  if (!carnet) return interaction.reply({ content: `❌ **${target}** no tiene carnet de conducir en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  const suspendido = carnet.suspendedUntil && carnet.suspendedUntil > Date.now() ? `⚠️ **SUSPENDIDO** hasta <t:${Math.floor(carnet.suspendedUntil / 1000)}:R>` : '✅ Válido';
  const embed = new EmbedBuilder().setTitle(`🚗 CARNET DE CONDUCIR - PJ${pj}`).setColor(0x00FF88).addFields(
    { name: 'Número', value: carnet.numero, inline: true },
    { name: 'Nombre', value: `${carnet.nombre} ${carnet.apellido}`, inline: true },
    { name: 'Emitido', value: carnet.fechaEmision, inline: true },
    { name: 'Estado', value: suspendido, inline: false }
  ).setThumbnail(target.user.displayAvatarURL());
  await interaction.reply({ embeds: [embed] });
}

async function handleVerLicenciaPolicia(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) return interaction.reply({ content: '❌ Solo Policía puede ver documentos.', flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const userData = getUserData(interaction.guild.id, target.id);
  const licencia = userData.pjs[pj].licenciaArmas;
  if (!licencia) return interaction.reply({ content: `❌ **${target}** no tiene licencia de armas en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  const suspendido = licencia.suspendedUntil && licencia.suspendedUntil > Date.now() ? `⚠️ **SUSPENDIDA** hasta <t:${Math.floor(licencia.suspendedUntil / 1000)}:R>` : '✅ Válida';
  const embed = new EmbedBuilder().setTitle(`🔫 LICENCIA DE ARMAS - PJ${pj}`).setColor(0xFF8800).addFields(
    { name: 'Número', value: licencia.numero, inline: true },
    { name: 'Nombre', value: `${licencia.nombre} ${licencia.apellido}`, inline: true },
    { name: 'Emitida', value: licencia.fechaEmision, inline: true },
    { name: 'Estado', value: suspendido, inline: false }
  ).setThumbnail(target.user.displayAvatarURL());
  await interaction.reply({ embeds: [embed] });
}

// ======================
// FUNCIONES ORIGINALES FALTANTES (VOTACIONES, DNI, SANCIONES, ECONOMÍA, LOTERÍA)
// ======================

// ======================
// VOTACIONES
// ======================
async function handleVotacion(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !interaction.member.roles.cache.some(r => r.name.toLowerCase().includes('staff'))) {
      return interaction.reply({ content: '❌ Solo el Staff puede usar este comando.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply();
  const embed = new EmbedBuilder()
    .setTitle('VOTACIÓN DE APERTURA DE SERVIDOR')
    .setDescription('**¿Te unirás a la apertura del servidor?**\nVota con los botones de abajo.\n\n⏰ La votación dura **30 minutos**.\nAl llegar a **5 votos "Me uniré"** se abrirá automáticamente.')
    .setColor(0x5865F2)
    .setFields(
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

  const mensaje = await interaction.editReply({ embeds: [embed], components: [row] });

  const pollData = {
    yes: 0, later: 0, no: 0,
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
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('vote_yes').setLabel('Me uniré').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(true),
      new ButtonBuilder().setCustomId('vote_later').setLabel('Me uniré más tarde').setStyle(ButtonStyle.Primary).setEmoji('⏰').setDisabled(true),
      new ButtonBuilder().setCustomId('vote_no').setLabel('No me uniré').setStyle(ButtonStyle.Danger).setEmoji('❌').setDisabled(true)
    );
    try { await interaction.update({ components: [disabledRow] }); } catch (e) {}
    return interaction.followUp({ content: '❌ Esta votación ya expiró o fue cancelada.', flags: MessageFlags.Ephemeral });
  }

  const customId = interaction.customId;
  const opcion = customId === 'vote_yes' ? 'yes' : customId === 'vote_later' ? 'later' : 'no';
  const userId = interaction.user.id;
  const displayName = interaction.member?.displayName || interaction.user.tag;
  const votoAnterior = pollData.voters.get(userId);

  if (votoAnterior === opcion) return interaction.reply({ content: '✅ Ya habías votado esta opción.', flags: MessageFlags.Ephemeral });
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
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !interaction.member.roles.cache.some(r => r.name.toLowerCase().includes('staff'))) {
      return interaction.reply({ content: '❌ Solo el Staff puede usar este comando.', flags: MessageFlags.Ephemeral });
  }
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
  if (!isCreator && !isAdmin) return interaction.editReply({ content: '❌ Solo el creador o un Administrador puede cancelarla.' });

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
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !interaction.member.roles.cache.some(r => r.name.toLowerCase().includes('staff'))) {
      return interaction.reply({ content: '❌ Solo el Staff puede usar este comando.', flags: MessageFlags.Ephemeral });
  }
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

  await interaction.editReply({ content: pingContent, embeds: [embed] });
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

  await channel.send({ content: pingContent, embeds: [embed] });
}

async function handleCerrarServer(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !interaction.member.roles.cache.some(r => r.name.toLowerCase().includes('staff'))) {
      return interaction.reply({ content: '❌ Solo el Staff puede usar este comando.', flags: MessageFlags.Ephemeral });
  }
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
// PANEL DNI + BOTONES DNI
// ======================
async function handlePanelDni(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden crear el panel de DNI.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const embed = new EmbedBuilder()
    .setTitle('🪪 SISTEMA OFICIAL DE DNI - ALBACETE RP')
    .setDescription('**Cada jugador puede tener hasta 2 personajes (PJ1 y PJ2).**\n\n• Crea tu DNI con tus datos reales del personaje.\n• Con el DNI podrás sacar **Carnet de Conducir** y **Licencia de Armas**.\n• Solo tú puedes gestionar tus documentos.\n• Los administradores pueden borrar documentos si es necesario.\n\nUsa los botones de abajo:')
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
// BOTONES DEL PANEL DNI (CREAR - VER - BORRAR)
// ======================
// ======================
// BOTONES DEL PANEL DNI - VERSIÓN CORREGIDA
// ======================
async function handleDniButton(interaction) {
  try {
    const customId = interaction.customId;
    let modal;

    if (customId === 'dni-crear') {
      modal = new ModalBuilder().setCustomId('modal-dni-crear').setTitle('🪪 Crear DNI - Personaje');
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
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pj').setLabel('Número de PJ').setPlaceholder('1 o 2').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(1))
      );
    } 
    else if (customId.startsWith('carnet-') || customId.startsWith('licencia-')) {
      const tipo = customId.startsWith('carnet') ? 'carnet' : 'licencia';
      const action = customId.split('-')[1];
      const titulo = tipo === 'carnet'
        ? (action === 'crear' ? '🚗 Crear Carnet de Conducir' : action === 'ver' ? '🔎 Ver Carnet' : '🗑️ Borrar Carnet')
        : (action === 'crear' ? '🔫 Crear Licencia de Armas' : action === 'ver' ? '🔎 Ver Licencia' : '🗑️ Borrar Licencia');

      modal = new ModalBuilder().setCustomId(`modal-${tipo}-${action}`).setTitle(titulo);
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pj').setLabel('Número de PJ').setPlaceholder('1 o 2').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(1))
      );
    }

    if (modal) await interaction.showModal(modal);
  } catch (error) {
    console.error('❌ Error en handleDniButton:', error);
    await interaction.reply({ content: '❌ Error al abrir el formulario.', flags: MessageFlags.Ephemeral });
  }
}

// ======================
// MULTA + COMANDOS POLICÍA Y STAFF (originales)
// ======================
async function handleMulta(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) {
    return interaction.reply({ content: '❌ Solo Policía puede multar.', flags: MessageFlags.Ephemeral });
  }
  const miembro = interaction.options.getMember('usuario');
  const cantidad = interaction.options.getInteger('cantidad');
  const razon = interaction.options.getString('razon');
  const guildId = interaction.guild.id;
  const userData = getUserData(guildId, miembro.id);
  userData.dinero -= cantidad;
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('💰 MULTA REGISTRADA')
    .setColor(0xFFAA00)
    .setTimestamp()
    .addFields(
      { name: 'Usuario', value: `${miembro}`, inline: false },
      { name: 'Cantidad', value: `**$${cantidad.toLocaleString('es-ES')}**`, inline: true },
      { name: 'Nuevo balance', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: true },
      { name: 'Moderador', value: interaction.user.toString(), inline: true },
      { name: 'Razón', value: razon, inline: false }
    );

  await interaction.reply({ embeds: [embed] });
  try { await miembro.send({ embeds: [embed] }); } catch {}
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

async function handleEstadoServer(interaction) {
  const estado = serverAbierto ? '🟢 **ABIERTO**' : '🔴 **CERRADO**';
  let texto = `**Estado actual:** ${estado}\n`;
  if (serverAbierto && ultimaApertura) {
    texto += `**Abierto desde:** <t:${Math.floor(ultimaApertura / 1000)}:R>\n`;
  }
  let votacionActiva = 'No hay votación activa.';
  for (const [_, poll] of votes.entries()) {
    if (poll.channel.id === interaction.channel.id) {
      const total = poll.yes + poll.later + poll.no;
      votacionActiva = `✅ **Votación activa** (${total} votos)`;
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
  if (cantidad < 100) {
    return interaction.reply({ content: '❌ La cantidad mínima es 100 $.', flags: MessageFlags.Ephemeral });
  }

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  const targetData = getUserData(interaction.guild.id, target.id);

  if (userData.dinero < cantidad) {
    return interaction.reply({ content: '❌ No tienes suficiente dinero.', flags: MessageFlags.Ephemeral });
  }

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
  if (cantidad < 100) {
    return interaction.reply({ content: '❌ La apuesta mínima es 100 $.', flags: MessageFlags.Ephemeral });
  }

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < cantidad) {
    return interaction.reply({ content: '❌ No tienes suficiente dinero.', flags: MessageFlags.Ephemeral });
  }

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

  if (ranking.length === 0) {
    return interaction.editReply('📭 Todavía no hay nadie con dinero.');
  }

  const embed = new EmbedBuilder()
    .setTitle('🏆 TABLA DE CLASIFICACIÓN - MÁS RICOS')
    .setColor(0xFFD700)
    .setTimestamp();

  ranking.forEach((entry, i) => {
    const member = interaction.guild.members.cache.get(entry.userId);
    const name = member ? member.user.tag : `ID: ${entry.userId}`;
    const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**#${i+1}**`;
    embed.addFields({
      name: `${medalla} ${name}`,
      value: `**$${entry.dinero.toLocaleString('es-ES')}**`,
      inline: false
    });
  });

  await interaction.editReply({ embeds: [embed] });
}

// ======================
// SISTEMA DE SANCIONES (multas ya desvinculadas)
// ======================

async function handleSancionar(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', flags: MessageFlags.Ephemeral });
  }
  const miembro = interaction.options.getMember('usuario');
  const gravedad = interaction.options.getString('gravedad');
  let razon = interaction.options.getString('razon') || 'Sin razón especificada';

  const mapaGravedad = {
    'aviso': '⚠️ Aviso',
    'leve': '📝 Falta Leve',
    'moderada': '⚠️ Falta Moderada',
    'grave': '🚨 Falta Grave'
  };
  const tipo = mapaGravedad[gravedad];

  const guildId = interaction.guild.id;
  if (!sanciones[guildId]) sanciones[guildId] = [];

  const sanctionId = sanciones[guildId].length + 1;

  const registro = {
    id: sanctionId,
    user_id: miembro.id,
    user_name: miembro.user.tag,
    mod_id: interaction.user.id,
    mod_name: interaction.user.tag,
    tipo: tipo,
    razon: razon,
    timestamp: new Date().toISOString()
  };

  sanciones[guildId].push(registro);
  guardarSanciones();

  const embedPublico = new EmbedBuilder()
    .setTitle('📋 Sanción Registrada')
    .setColor(0xFF0000)
    .setTimestamp()
    .addFields(
      { name: 'Usuario', value: `${miembro} (\`${miembro.id}\`)`, inline: false },
      { name: 'Tipo', value: tipo, inline: true },
      { name: 'Moderador', value: interaction.user.toString(), inline: true },
      { name: 'Razón', value: razon, inline: false }
    )
    .setFooter({ text: `Sanción ID: ${sanctionId}` });

  await interaction.reply({ embeds: [embedPublico] });

  const embedDM = new EmbedBuilder()
    .setTitle('📋 Has recibido una sanción')
    .setDescription('Esta sanción ha quedado registrada en el servidor.')
    .setColor(0xFF0000)
    .setTimestamp()
    .addFields(
      { name: 'Tipo', value: tipo },
      { name: 'Razón', value: razon },
      { name: 'Moderador', value: interaction.user.tag }
    )
    .setFooter({ text: `Servidor: ${interaction.guild.name} | ID: ${sanctionId}` });

  try {
    await miembro.send({ embeds: [embedDM] });
  } catch (err) {
    await interaction.followUp({ content: '⚠️ No se pudo enviar DM al usuario.', flags: MessageFlags.Ephemeral });
  }
}

async function handleVerSanciones(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', flags: MessageFlags.Ephemeral });
  }
  const guildId = interaction.guild.id;
  const lista = sanciones[guildId] || [];

  if (lista.length === 0) {
    return interaction.reply({ content: '📭 No hay sanciones registradas.', flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 Todas las sanciones del servidor (${lista.length})`)
    .setColor(0xFFA500);

  const ultimas = lista.slice(-15).reverse();
  ultimas.forEach(s => {
    embed.addFields({
      name: `ID: ${s.id} | ${s.user_name} • ${s.tipo}`,
      value: `**Razón:** ${s.razon}\n**Moderador:** ${s.mod_name}\n**Fecha:** <t:${Math.floor(new Date(s.timestamp).getTime() / 1000)}:R>`,
      inline: false
    });
  });

  if (lista.length > 15) embed.setFooter({ text: `Mostrando las últimas 15` });

  await interaction.reply({ embeds: [embed] });
}

async function handleVerSancionesUsuario(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', flags: MessageFlags.Ephemeral });
  }
  const miembro = interaction.options.getMember('usuario');
  const guildId = interaction.guild.id;
  const lista = sanciones[guildId] || [];
  const usuarioSanciones = lista.filter(s => s.user_id === miembro.id);

  if (usuarioSanciones.length === 0) {
    return interaction.reply({ content: `📭 **${miembro}** no tiene sanciones.`, flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 Sanciones de ${miembro.user.tag} (${usuarioSanciones.length})`)
    .setColor(0xFF0000)
    .setThumbnail(miembro.user.displayAvatarURL());

  usuarioSanciones.reverse().forEach(s => {
    embed.addFields({
      name: `ID: ${s.id} • ${s.tipo}`,
      value: `**Razón:** ${s.razon}\n**Moderador:** ${s.mod_name}\n**Fecha:** <t:${Math.floor(new Date(s.timestamp).getTime() / 1000)}:R>`,
      inline: false
    });
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleEliminarSancion(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', flags: MessageFlags.Ephemeral });
  }
  const sanctionId = interaction.options.getInteger('id');
  const guildId = interaction.guild.id;
  const lista = sanciones[guildId] || [];
  const indice = lista.findIndex(s => s.id === sanctionId);

  if (indice === -1) {
    return interaction.reply({ content: `❌ No existe la sanción con ID \`${sanctionId}\`.`, flags: MessageFlags.Ephemeral });
  }

  const usuario = lista[indice].user_name;
  lista.splice(indice, 1);
  sanciones[guildId] = lista;
  guardarSanciones();

  await interaction.reply(`✅ **Sanción ID ${sanctionId}** de **${usuario}** eliminada.`);
}

// ======================
// LOTERÍA - FUNCIONES
// ======================
function scheduleNextDraw() {
  if (loteriaData.nextDraw && loteriaData.nextDraw > Date.now()) {
    const tiempoRestante = loteriaData.nextDraw - Date.now();
    setTimeout(realizarSorteo, tiempoRestante);
  } else {
    loteriaData.nextDraw = Date.now() + DRAW_INTERVAL_MS;
    guardarLoteria();
    setTimeout(realizarSorteo, DRAW_INTERVAL_MS);
  }
}

async function realizarSorteo() {
  const totalTickets = Object.values(loteriaData.tickets).reduce((a, b) => a + b, 0);
  if (totalTickets === 0) {
    loteriaData.nextDraw = Date.now() + DRAW_INTERVAL_MS;
    guardarLoteria();
    setTimeout(realizarSorteo, DRAW_INTERVAL_MS);
    return;
  }

  let randomTicket = Math.floor(Math.random() * totalTickets) + 1;
  let winnerId = null;
  let accumulated = 0;
  for (const [userId, count] of Object.entries(loteriaData.tickets)) {
    accumulated += count;
    if (randomTicket <= accumulated) {
      winnerId = userId;
      break;
    }
  }

  const premio = loteriaData.jackpot;
  const guild = client.guilds.cache.first();
  const winnerMember = guild ? guild.members.cache.get(winnerId) : null;
  const winnerTag = winnerMember ? winnerMember.user.tag : 'Usuario desconocido';

  loteriaData.history.unshift({
    drawId: loteriaData.currentDrawId,
    winnerId: winnerId,
    winnerTag: winnerTag,
    amount: premio,
    timestamp: new Date().toISOString()
  });
  if (loteriaData.history.length > 10) loteriaData.history.pop();

  const winnerData = getUserData(guild.id, winnerId);
  winnerData.dinero += premio;
  guardarIdentidades();

  loteriaData.jackpot = 10000;
  loteriaData.tickets = {};
  loteriaData.currentDrawId++;
  loteriaData.nextDraw = Date.now() + DRAW_INTERVAL_MS;
  guardarLoteria();

  const embed = new EmbedBuilder()
    .setTitle('🎉 ¡SORTEO DE LOTERÍA REALIZADO!')
    .setColor(0xFFD700)
    .setDescription(`**Ganador:** <@${winnerId}> (${winnerTag})\n**Premio:** **$${premio.toLocaleString('es-ES')}**`)
    .setTimestamp();

  const channel = guild.channels.cache.find(c => c.name.includes('general') || c.name.includes('chat')) || guild.systemChannel;
  if (channel) channel.send({ embeds: [embed], content: `<@${winnerId}> ¡Enhorabuena!` });

  setTimeout(realizarSorteo, DRAW_INTERVAL_MS);
}

async function handleLoteriaComprar(interaction) {
  const cantidad = interaction.options.getInteger('cantidad');
  const totalCoste = cantidad * TICKET_PRICE;
  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < totalCoste) return interaction.reply({ content: `❌ No tienes suficiente dinero. Necesitas **$${totalCoste}**`, flags: MessageFlags.Ephemeral });

  userData.dinero -= totalCoste;
  loteriaData.jackpot += totalCoste;
  if (!loteriaData.tickets[interaction.user.id]) loteriaData.tickets[interaction.user.id] = 0;
  loteriaData.tickets[interaction.user.id] += cantidad;
  guardarIdentidades();
  guardarLoteria();

  const embed = new EmbedBuilder()
    .setTitle('🎟️ Boletos comprados')
    .setColor(0x00FF88)
    .setDescription(`Has comprado **${cantidad}** boletos por **$${totalCoste}**`)
    .addFields(
      { name: 'Jackpot actual', value: `**$${loteriaData.jackpot.toLocaleString('es-ES')}**`, inline: true },
      { name: 'Tus boletos', value: `${loteriaData.tickets[interaction.user.id]}`, inline: true }
    );
  await interaction.reply({ embeds: [embed] });
}

async function handleLoteria(interaction) {
  const totalTickets = Object.values(loteriaData.tickets).reduce((a, b) => a + b, 0);
  const tiempoRestante = loteriaData.nextDraw ? Math.max(0, loteriaData.nextDraw - Date.now()) : 0;
  const horas = Math.floor(tiempoRestante / 3600000);
  const minutos = Math.floor((tiempoRestante % 3600000) / 60000);

  const embed = new EmbedBuilder()
    .setTitle('🎟️ Lotería ALBACETE RP')
    .setColor(0xFFD700)
    .addFields(
      { name: '💰 Jackpot actual', value: `**$${loteriaData.jackpot.toLocaleString('es-ES')}**`, inline: true },
      { name: '🎟️ Boletos vendidos', value: `${totalTickets}`, inline: true },
      { name: '⏰ Próximo sorteo', value: `${horas}h ${minutos}m`, inline: true },
      { name: 'Sorteo cada', value: '6 horas', inline: true }
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

async function handleLoteriaHistorial(interaction) {
  if (loteriaData.history.length === 0) return interaction.reply({ content: '📭 Aún no hay ganadores registrados.', flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder().setTitle('🏆 Historial de Ganadores - Lotería').setColor(0xFFD700);
  loteriaData.history.forEach(entry => {
    embed.addFields({
      name: `Sorteo #${entry.drawId}`,
      value: `**Ganador:** ${entry.winnerTag}\n**Premio:** $${entry.amount.toLocaleString('es-ES')}\n<t:${Math.floor(new Date(entry.timestamp).getTime() / 1000)}:R>`,
      inline: false
    });
  });
  await interaction.reply({ embeds: [embed] });
}
async function handleCrearItemSubasta(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }

  const nombre = interaction.options.getString('nombre');
  const preciomin = interaction.options.getInteger('preciomin');
  const duracion = interaction.options.getInteger('duracion');
  const descripcion = interaction.options.getString('descripcion');

  if (duracion < 1 || duracion > 48) {
    return interaction.reply({ content: '❌ La duración debe estar entre 1 y 48 horas.', flags: MessageFlags.Ephemeral });
  }

  const subastaId = generarIDCorto('SUB');
  const subasta = {
    id: subastaId,
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    sellerId: interaction.user.id,
    item: `${nombre} (Admin)`,
    currentBid: preciomin,
    currentBidder: null,
    endTime: Date.now() + duracion * 3600000,
    ended: false,
    descripcion: descripcion
  };

  subastasGlobal.push(subasta);
  guardarSubastas();

  setTimeout(() => finalizarSubasta(subastaId, client), subasta.endTime - Date.now());

  const embed = new EmbedBuilder()
    .setTitle(`🛒 NUEVA SUBASTA ADMIN - ${subastaId}`)
    .setDescription(`**Artículo:** ${nombre}\n**Descripción:** ${descripcion}\n**Puja mínima:** $${preciomin.toLocaleString('es-ES')}\n**Duración:** ${duracion} horas\n**Creado por:** ${interaction.user}`)
    .setColor('#FF00FF')
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleMorosos(interaction) {
  const ENCARGADO_ROL = '1497936257219559455'; 
  if (!interaction.member.roles.cache.has(ENCARGADO_ROL) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ Solo encargados pueden ver morosos.', flags: MessageFlags.Ephemeral });

  const morosos = prestamosGlobal.filter(p => p.estado === 'aprobado' && p.fechaLimite < Date.now());
  if (morosos.length === 0) return interaction.reply({ content: '✅ El banco está limpio. No hay morosos actualmente.', flags: MessageFlags.Ephemeral });

  let desc = morosos.map(p => `**ID:** ${p.id} | <@${p.userId}> | **Deuda:** ${p.aPagar}€ | **Venció:** <t:${Math.floor(p.fechaLimite/1000)}:R>`).join('\n');
  await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🚨 Lista Negra de Morosos').setDescription(desc).setColor('#FF0000')], flags: MessageFlags.Ephemeral });
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
      lastSalary: null,
      drogas: { marihuana: 0, cocaina: 0 } // AÑADIDO PARA IDEA E
    };
  } else {
    if (typeof identidades[guildId][userId].dinero !== 'number') identidades[guildId][userId].dinero = 6000;
    if (!identidades[guildId][userId].lastSalary) identidades[guildId][userId].lastSalary = null;
    if (!identidades[guildId][userId].drogas) identidades[guildId][userId].drogas = { marihuana: 0, cocaina: 0 }; // AÑADIDO
  }
  return identidades[guildId][userId];
}

// ======================
// LOGIN DEL BOT
// ======================
client.login(process.env.TOKEN)
  .catch(err => console.error('❌ Error al iniciar sesión:', err));
