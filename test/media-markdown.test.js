import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdownImages, serializeMarkdownImage, markdownImagesToGalleryMarkup } from '../src/media-markdown.js';

test('markdownImagesToGalleryMarkup creates a LightGallery container for Markdown image blocks', () => {
  const source = '![One](https://example.com/one.png)\n\n![Two](https://example.com/two.png)';
  const html = markdownImagesToGalleryMarkup(source);

  assert.match(html, /class="media-gallery(?:\s+[^\"]+)?"/);
  assert.match(html, /href="https:\/\/example.com\/one.png"/);
  assert.match(html, /href="https:\/\/example.com\/two.png"/);
});

test('parseMarkdownImages keeps balanced parentheses in image URLs', () => {
  const source = '![Cover](https://example.com/image_(1).jpg)';
  const [image] = parseMarkdownImages(source);

  assert.equal(image.src, 'https://example.com/image_(1).jpg');
  assert.equal(source.slice(image.start, image.end), source);
});

test('parseMarkdownImages supports escaped delimiters and optional titles', () => {
  const source = '![Product](https://example.com/a\\)b.png "Product image")';
  const [image] = parseMarkdownImages(source);

  assert.equal(image.src, 'https://example.com/a\\)b.png');
  assert.equal(image.title, 'Product image');
});

test('parseMarkdownImages returns exact ranges for multiple images', () => {
  const first = '![One](https://example.com/one.png)';
  const second = '![Two](https://example.com/two_(2).png)';
  const source = `${first}\n\n${second}`;
  const images = parseMarkdownImages(source);

  assert.equal(images.length, 2);
  assert.equal(source.slice(images[0].start, images[0].end), first);
  assert.equal(source.slice(images[1].start, images[1].end), second);
});

test('markdownImagesToGalleryMarkup groups consecutive images into a 3-column preview with overflow count', () => {
  const source = '![One](https://example.com/one.png)\n![Two](https://example.com/two.png)\n![Three](https://example.com/three.png)\n![Four](https://example.com/four.png)\n![Five](https://example.com/five.png)';
  const html = markdownImagesToGalleryMarkup(source);

  assert.match(html, /class="media-gallery media-gallery-grid-3"/);
  assert.match(html, /data-overflow-count="2"/);
  assert.match(html, /\+2 more/i);
  assert.match(html, /href="https:\/\/example.com\/one.png"/);
  assert.match(html, /href="https:\/\/example.com\/five.png"/);
});

test('serializeMarkdownImage preserves a valid optional title', () => {
  assert.equal(
    serializeMarkdownImage({
      caption: 'Updated image',
      src: 'https://example.com/image_(1).jpg',
      title: 'Image title'
    }),
    '![Updated image](https://example.com/image_(1).jpg "Image title")'
  );
});