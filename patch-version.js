var replace = require('replace-in-file');
var package = require('./package.json');
var buildVersion = package.version;
var today = new Date();
var buildDateFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};
var buildDate = today.toLocaleDateString('en-US', buildDateFormatOptions);

var files = [
  'src/environments/environment.ts',
  'src/environments/environment.prod.ts',
  'src/environments/environment.dev.ts',
  'src/environments/environment.web.ts',
];

const versionOptions = {
  files: files,
  from: /version: '(.*)'/g,
  to: "version: '" + buildVersion + "'",
  allowEmptyPaths: false,
};

try {
  let changedFiles = replace.sync(versionOptions);
  if (changedFiles == 0) {
    throw "Please make sure that file '" + versionOptions.files + "' has \"version: ''\"";
  }
  console.log('Build version set: ' + buildVersion);
} catch (error) {
  console.error('Error occurred:', error);
  throw error;
}

const buildDateOptions = {
  files: files,
  from: /buildDate: '(.*)'/g,
  to: "buildDate: '" + buildDate + "'",
  allowEmptyPaths: false,
};

try {
  let changedFiles = replace.sync(buildDateOptions);
  if (changedFiles == 0) {
    throw "Please make sure that file '" + buildDateOptions.files + "' has \"buildDate: ''\"";
  }
  console.log('Build date set: ' + buildDate);
} catch (error) {
  console.error('Error occurred:', error);
  throw error;
}
