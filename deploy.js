const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("spam")
    .setDescription("ส่งข้อความรัวๆสร้างช่องโปรโมท .addStringOption(opt =>
      opt.setName("text")
        .setDescription("ข้อความที่มึงต้องการส่ง")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("count")
        .setDescription("จำนวนครั้ง (สูงสุด 10000000)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("join")
    .setDescription("ให้บอทกูเข้าห้องเสียง"),

  new SlashCommandBuilder()
    .setName("promo")
    .setDescription("ช่วยกูโปรโมท Discord เซิร์ฟเวอร์"),

  new SlashCommandBuilder()
    .setName("createpromo")
    .setDescription("ยิงโปรโมทEXSHOP อัตโนมัติ"),

  new SlashCommandBuilder()
    .setName("emoji")
    .setDescription("ส่งอีโมจิรัวๆ")
    .addStringOption(opt =>
      opt.setName("emoji")
        .setDescription("อีโมจิที่ต้องการส่ง")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("count")
        .setDescription("จำนวนครั้ง (สูงสุด 10000000)")
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName("delay")
        .setDescription("หน่วงเวลา (ms เช่น 10 = 00.1 วิ)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("เตะสมาชิกออกจากเซิร์ฟเวอร์")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("สมาชิกที่ต้องการเตะ")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("เหตุผลในการเตะ")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("tell_off")
    .setDescription("ส่งข้อความสุ่มรัวๆ")
    .addIntegerOption(opt =>
      opt.setName("count")
        .setDescription("จำนวนครั้ง")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("senddm")
    .setDescription("ยิง DM รัวๆ")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("ผู้รับ")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("text")
        .setDescription("มึงใส่ข้อความ")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("count")
        .setDescription("จำนวนครั้ง (สูงสุด 10000000)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("allowdm")
    .setDescription("กูบ่บอกกก"),

  new SlashCommandBuilder()
    .setName("shootdm")
    .setDescription("สั่งยิง DM (ต้องแอดมินและผู้รับยินยอม)")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("เหยื่อ")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("text")
        .setDescription("ข้อความ")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("count")
        .setDescription("จำนวน (สูงสุด 10000000)")
        .setRequired(false)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Registering commands...");
    const data = await rest.get(Routes.user());
    await rest.put(
      Routes.applicationCommands(data.id),
      { body: commands }
    );
    console.log("✅ Commands registered");
  } catch (err) {
    console.error("❌ Error registering commands:", err);
  }
})();
