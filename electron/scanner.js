const { exec } = require('child_process');
const path = require('path');

function scanProject(projectPath) {
  return new Promise((resolve, reject) => {
    const jarPath = path.join(__dirname, '../java-tools/build/libs/java-tools.jar');

    exec(java -jar "\" "\", (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
        return;
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject('Failed to parse scanner output: ' + stdout);
      }
    });
  });
}

module.exports = { scanProject };
