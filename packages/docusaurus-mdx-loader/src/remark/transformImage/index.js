/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const visit = require('unist-util-visit');
const path = require('path');
const url = require('url');
const fs = require('fs-extra');
const {getFileLoaderUtils} = require('@docusaurus/core/lib/webpack/utils');
const {posixPath} = require('@docusaurus/utils');

const {
  loaders: {inlineMarkdownImageFileLoader},
} = getFileLoaderUtils();

const createJSX = (node, pathUrl) => {
  node.type = 'jsx';
  node.value = `<img ${node.alt ? `alt={"${node.alt}"}` : ''} ${
    node.url
      ? `src={require("${inlineMarkdownImageFileLoader}${pathUrl}").default}`
      : ''
  } ${node.title ? `title={"${node.title}"}` : ''} />`;

  if (node.url) {
    delete node.url;
  }
  if (node.alt) {
    delete node.alt;
  }
  if (node.title) {
    delete node.title;
  }
};

/**
 * Revove replace the starting "../" with "".
 * E.g: ../package/doc -> package/doc
 */
function cleanPath(filePath) {
  if (filePath.startsWith('../')) {
    return filePath.replace('../', '');
  } else {
    return filePath;
  }
}

// Needed to throw errors with computer-agnostic path messages
// Absolute paths are too dependant of user FS
function toRelativePath(filePath) {
  console.log('filePath', filePath);
  console.log('CWD', process.cwd());
  return cleanPath(posixPath(path.relative(process.cwd(), filePath)));
}

async function ensureImageFileExist(imagePath, sourceFilePath) {
  console.log('Imagepath : ', imagePath);
  console.log('SourceFilePath : ', sourceFilePath);
  const imageExists = await fs.exists(imagePath);
  console.log('Image Exists : ', imageExists);
  if (!imageExists) {
    throw new Error(
      `Image ${toRelativePath(imagePath)} used in ${toRelativePath(
        sourceFilePath,
      )} not found.`,
    );
  }
}

async function processImageNode(node, {filePath, staticDir}) {
  console.log('123456');
  console.log('Node : ', node);
  console.log('FilePath : ', filePath);
  console.log('StaticDir : ', staticDir);
  if (!node.url) {
    throw new Error(
      `Markdown image url is mandatory. filePath=${toRelativePath(filePath)}`,
    );
  }

  const parsedUrl = url.parse(node.url);
  if (parsedUrl.protocol) {
    // pathname:// is an escape hatch,
    // in case user does not want his images to be converted to require calls going through webpack loader
    // we don't have to document this for now,
    // it's mostly to make next release less risky (2.0.0-alpha.59)
    if (parsedUrl.protocol === 'pathname:') {
      node.url = node.url.replace('pathname://', '');
    } else {
      // noop
    }
  }
  // images without protocol
  else if (path.isAbsolute(node.url)) {
    // absolute paths are expected to exist in the static folder
    const expectedImagePath = path.join(staticDir, node.url);
    await ensureImageFileExist(expectedImagePath, filePath);
    createJSX(node, posixPath(expectedImagePath));
  }
  // We try to convert image urls without protocol to images with require calls
  // going through webpack ensures that image assets exist at build time
  else {
    // relative paths are resolved against the source file's folder
    const expectedImagePath = path.join(path.dirname(filePath), node.url);
    await ensureImageFileExist(expectedImagePath, filePath);
    createJSX(node, node.url.startsWith('./') ? node.url : `./${node.url}`);
  }
}

const plugin = (options) => {
  const transformer = async (root) => {
    const promises = [];
    visit(root, 'image', (node) => {
      promises.push(processImageNode(node, options));
    });
    await Promise.all(promises);
  };
  return transformer;
};

module.exports = plugin;
