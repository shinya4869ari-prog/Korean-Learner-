const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// 日本語テキスト抽出関数
function extractJapaneseText(structuredContent) {
  let text = "";

  function traverse(obj) {
    if (typeof obj === "string") {
      text += obj;
    } else if (Array.isArray(obj)) {
      obj.forEach(traverse);
    } else if (typeof obj === "object" && obj !== null) {
      // lang: "ja" の要素のみ抽出、lang: "ko" は除外
      if (obj.lang === "ja" && obj.content) {
        traverse(obj.content);
      } else if (obj.lang === "ko") {
        // 韓国語はスキップ
        return;
      } else if (obj.content) {
        traverse(obj.content);
      }
    }
  }

  traverse(structuredContent);
  return text.trim();
}

// メイン処理
async function main() {
  const termBankFiles = [];
  for (let i = 1; i <= 11; i++) {
    termBankFiles.push(path.join(__dirname, "dict_data", `term_bank_${i}.json`));
  }

  const allData = [];

  for (const filePath of termBankFiles) {
    console.log(`Reading ${filePath}...`);
    const content = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(content);

    for (const entry of data) {
      const word = entry[1]; // ハングル表記（インデックス1）
      const hanja = entry[0]; // 漢字表記（インデックス0）
      const pos = entry[2]; // 品詞（インデックス2）
      const type = entry[3]; // 活用型（インデックス3）
      const level = entry[4]; // レベル（インデックス4）
      const meaningData = entry[5]; // 日本語訳データ（インデックス5）

      // 日本語訳を抽出
      const meaning = extractJapaneseText(meaningData);

      allData.push({
        word,
        hanja,
        pos,
        meaning,
        level: level || 'KRDICT'
      });
    }
  }

  console.log(`Total entries: ${allData.length}`);

  // 2,500件ずつバッチ分割
  const batchSize = 2500;
  const batches = [];

  for (let i = 0; i < allData.length; i += batchSize) {
    const batch = allData.slice(i, i + batchSize);
    const sqlStatements = batch.map((entry) => {
      const word = entry.word.replace(/'/g, "''");
      const hanja = entry.hanja.replace(/'/g, "''");
      const pos = entry.pos.replace(/'/g, "''");
      const meaning = entry.meaning.replace(/'/g, "''");
      const level = entry.level.replace(/'/g, "''");

      return `INSERT OR REPLACE INTO dictionary (word, hanja, pos, meaning, level) VALUES ('${word}', '${hanja}', '${pos}', '${meaning}', '${level}');`;
    });

    const sqlContent = sqlStatements.join("\n");
    const batchNum = Math.floor(i / batchSize) + 1;
    const filePath = path.join(__dirname, `import_batch_${batchNum}.sql`);
    fs.writeFileSync(filePath, sqlContent, "utf8");
    batches.push(filePath);
    console.log(`Batch ${batchNum} created: ${batch.length} entries`);
  }

  console.log(`Total batches: ${batches.length}`);

  // 順番にインポート実行
  console.log("\nStarting import...");
  for (let i = 0; i < batches.length; i++) {
    const batchFile = batches[i];
    console.log(`\n[${i + 1}/${batches.length}] Importing ${batchFile}...`);

    try {
      execSync(`npx wrangler d1 execute korean-learner-dict --remote --file="${batchFile}"`, {
        stdio: "inherit",
        cwd: __dirname
      });
      console.log(`✅ Batch ${i + 1} completed`);
    } catch (error) {
      console.error(`❌ Batch ${i + 1} failed:`, error.message);
      throw error;
    }
  }

  // クリーンアップ
  console.log("\nCleaning up temporary SQL files...");
  for (const batchFile of batches) {
    fs.unlinkSync(batchFile);
    console.log(`Deleted: ${batchFile}`);
  }

  console.log("\n✅ Import completed successfully!");
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
