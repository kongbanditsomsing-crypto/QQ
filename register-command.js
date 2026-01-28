const commands = [

  new SlashCommandBuilder()
    .setName("spam")
    .setDescription("Spam text")
    .addStringOption(o =>
      o.setName("text").setDescription("ข้อความ").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("count").setDescription("จำนวน สูงสุด999999")
    ),

  new SlashCommandBuilder()
    .setName("emoji")
    .setDescription("Spam emoji")
    .addStringOption(o =>
      o.setName("emoji").setDescription("emoji").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("count").setDescription("จำนวน")
    )
    .addIntegerOption(o =>
      o.setName("delay").setDescription("delay ms")
    ),

  new SlashCommandBuilder()
    .setName("join")
    .setDescription("เข้าห้องเสียง"),

  new SlashCommandBuilder()
    .setName("tell_off")
    .setDescription("ยิงข้อความ random")
    .addIntegerOption(o =>
      o.setName("count").setDescription("จำนวน สูงสุด999999")
    ),

  new SlashCommandBuilder()
    .setName("create_room")
    .setDescription("ยิงห้อง")
    .addIntegerOption(o =>
      o.setName("amount")
       .setDescription("จำนวนห้อง สูงสุด1000")
       .setRequired(true)
       .setMinValue(1)
       .setMaxValue(1000)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("เตะคนออกจากเซิร์ฟ")
    .addUserOption(o =>
      o.setName("target").setDescription("เลือกคน").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("เหตุผลของมึง")
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("แบนคนออกจากเซิร์ฟ")
    .addUserOption(o =>
      o.setName("target").setDescription("เลือกคน").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("เหตุผล ขัดหูีขัดตา เเล้วเเต่มึง")
    ),

  // ============ เพิ่มใหม่ ============
  new SlashCommandBuilder()
    .setName("dm")
    .setDescription("ยิงข้อความเข้า DM")
    .addUserOption(o =>
      o.setName("target")
       .setDescription("เลือกคน")
       .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("text")
       .setDescription("ข้อความที่ต้องการยิง")
       .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("count")
       .setDescription("จำนวน สูงสุด999999")
    )

];