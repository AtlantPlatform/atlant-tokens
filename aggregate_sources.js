const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function aggregateSoliditySources(mainContractSrcFileName, targetFilePath) {
    const outDir = path.dirname(targetFilePath);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, {recursive: true});
    }

    const writeStream = fs.createWriteStream(targetFilePath, {flags: "w"});
    for await (const line of readImportFile(mainContractSrcFileName, [])) {
        if (line == "\n") {
            continue;
        }

        writeStream.write(line);
        writeStream.write("\n");
    }
}

async function* readImportFile(importFilePath, alreadyDeclaredImports) {

    const readStream = fs.createReadStream(importFilePath);
    const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
      });

    const currentDir = path.dirname(importFilePath);

    for await (const line of rl) {
        if (line.startsWith("import")) {
            let importSource = line.substring(line.indexOf("\"") + 1, line.lastIndexOf("\""));
            if (importSource.startsWith("@openzeppelin")) {
                importSource = importSource.replace("@openzeppelin", "../node_modules/@openzeppelin")
            }

            const importFile = path.join(currentDir, importSource);

            if (alreadyDeclaredImports.includes(importFile)) {
                continue;
            }

            alreadyDeclaredImports.push(importFile);

            for await (let importFileLine of readImportFile(importFile, alreadyDeclaredImports)) {
                if (importFileLine.startsWith("pragma")) {
                    continue;
                }

                if (importFileLine.startsWith("// SPDX-License-Identifier")) {
                    continue;
                }

                yield importFileLine;
            }
        }
        else {
            yield line;
        }
    }
}

aggregateSoliditySources("./contracts/TokenPrototype.sol", "./build/aggregates/TokenPrototype.sol");

aggregateSoliditySources("./contracts/RegulatorServicePrototype.sol", "./build/aggregates/RegulatorServicePrototype.sol");
