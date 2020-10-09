/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {join, relative} from 'path';
import remark from 'remark';
import mdx from 'remark-mdx';
import vfile from 'to-vfile';
import plugin from '../index';
import slug from '../../slug/index';

const processFixture = async (name, options) => {
  const path = join(__dirname, 'fixtures', `${name}.md`);
  const file = await vfile.read(path);
  const result = await remark()
    .use(slug)
    .use(mdx)
    .use(plugin, {...options, filePath: path})
    .process(file);

  return result.toString();
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

// avoid hardcoding absolute
const staticDir = cleanPath(
  join(`./${relative(process.cwd(), join(__dirname, 'fixtures'))}`),
);

console.log('111111');
console.log('AAAA', staticDir);

describe('transformImage plugin', () => {
  test('fail if image does not exist', async () => {
    await expect(
      processFixture('fail', {
        staticDir,
      }),
    ).rejects.toThrowErrorMatchingSnapshot();
  });
  test('fail if image url is absent', async () => {
    await expect(
      processFixture('noUrl', {
        staticDir,
      }),
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test('transform md images to <img />', async () => {
    const result = await processFixture('img', {
      staticDir,
    });

    console.log('RESULT', result);

    expect(result).toMatchSnapshot();
  });

  test('pathname protocol', async () => {
    const result = await processFixture('pathname', {
      staticDir,
    });
    expect(result).toMatchSnapshot();
  });
});
