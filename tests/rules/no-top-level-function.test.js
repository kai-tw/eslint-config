import { test } from 'node:test';
import { ConsumerConfig } from '../support/consumer-config.js';
import { RuleCase } from '../support/rule-case.js';

const rule = new RuleCase('no-top-level-function');
const nextConsumer = new ConsumerConfig(['recommended', 'next'], []);

const plainFile = 'src/domain/total.ts';
const pageFile = 'src/app/x/page.tsx';
const componentFile = 'src/presentation/price_tag.tsx';
const handlerFile = 'app/api/x/route.ts';

const pageOptions = {
  allowExports: ['default', 'generateMetadata', 'generateStaticParams'],
  allowComponents: true,
};
const componentOptions = { allowExports: [], allowComponents: true };
const routeOptions = {
  allowExports: ['GET', 'POST', 'generateStaticParams'],
  allowComponents: false,
};
const defaultExportOptions = { allowExports: ['default'], allowComponents: false };
const imageOptions = { allowExports: ['default'], allowComponents: true };

const pageExports = [
  'export default function Page() { return <main />; }',
  'export async function generateMetadata() { return {}; }',
  'export function generateStaticParams() { return []; }',
];

test('[S2] reports an exported function declaration', async () => {
  await rule.invalid({
    code: 'export function total() { return 1; }',
    filename: plainFile,
    errors: 1,
  });
});

test('[S2] reports a top-level const bound to an arrow function', async () => {
  await rule.invalid({ code: 'const total = () => 1;', filename: plainFile, errors: 1 });
});

test('[S2] reports a function declaration that is not exported', async () => {
  await rule.invalid({
    code: 'function total() { return 1; }',
    filename: plainFile,
    errors: 1,
  });
});

test('[S2] reports a top-level let bound to a function expression', async () => {
  await rule.invalid({
    code: 'let total = function () { return 1; };',
    filename: plainFile,
    errors: 1,
  });
});

test('[S2] reports an arrow function wrapped in as', async () => {
  await rule.invalid({
    code: 'const total = (() => 1) as () => number;',
    filename: plainFile,
    errors: 1,
  });
});

test('[S2] reports an exported arrow function wrapped in satisfies', async () => {
  await rule.invalid({
    code: 'export const total = (() => 1) satisfies () => number;',
    filename: plainFile,
    errors: 1,
  });
});

test('[S2] reports each top-level function in a file', async () => {
  await rule.invalid({
    code: ['function total() { return 1; }', 'export const count = () => 2;'].join('\n'),
    filename: plainFile,
    errors: 2,
  });
});

test('[S2] does not report a function declared inside a class method', async () => {
  await rule.valid({
    code: [
      'export class Lantern {',
      '  total(): number {',
      '    const add = (a: number, b: number) => a + b;',
      '    return add(1, 2);',
      '  }',
      '}',
    ].join('\n'),
    filename: plainFile,
  });
});

test('[B3] does not report a top-level numeric const', async () => {
  await rule.valid({ code: 'export const MAX_ITEMS = 50;', filename: plainFile });
});

test('[B3] does not report a top-level schema built by a call', async () => {
  await rule.valid({
    code: [
      "import { z } from 'zod';",
      'export const widgetSchema = z.object({ name: z.string() });',
    ].join('\n'),
    filename: plainFile,
  });
});

test('[B3] does not report an arrow function passed to a top-level call', async () => {
  await rule.valid({ code: "register('widget', () => 1);", filename: plainFile });
});

test('[S3] does not report Page, generateMetadata and generateStaticParams named by allowExports', async () => {
  await rule.valid({
    code: pageExports.join('\n'),
    filename: pageFile,
    options: [pageOptions],
  });
});

test('[S3] reports a helper beside the allowed page exports', async () => {
  await rule.invalid({
    code: [...pageExports, 'function formatTitle(title: string) { return title; }'].join('\n'),
    filename: pageFile,
    options: [pageOptions],
    errors: 1,
  });
});

test('[S3] reports the page exports when no options are given', async () => {
  await rule.invalid({ code: pageExports.join('\n'), filename: pageFile, errors: 3 });
});

test('[B7] reports a function that is not exported under a name allowExports lists', async () => {
  await rule.invalid({
    code: 'function generateMetadata() { return {}; }',
    filename: pageFile,
    options: [pageOptions],
    errors: 1,
  });
});

test('[B7] reports an unexported generateMetadata in page.tsx with the options configs.next gives it', async () => {
  const [, ...options] = await nextConsumer.ruleEntry(pageFile, '@kai-tw/no-top-level-function');
  await rule.invalid({
    code: 'async function generateMetadata() { return {}; }',
    filename: pageFile,
    options,
    errors: 1,
  });
});

test('[B7] does not report a function exported through a specifier under a name allowExports lists', async () => {
  await rule.valid({
    code: ['async function GET() { return new Response(); }', 'export { GET };'].join('\n'),
    filename: handlerFile,
    options: [routeOptions],
  });
});

test('[B7] does not report a function exported through a specifier renamed to a name allowExports lists', async () => {
  await rule.valid({
    code: [
      'async function handle() { return new Response(); }',
      'export { handle as GET };',
    ].join('\n'),
    filename: handlerFile,
    options: [routeOptions],
  });
});

test('[B7] does not report a local function that the default export names', async () => {
  await rule.valid({
    code: ['function load() { return <main />; }', 'export default load;'].join('\n'),
    filename: pageFile,
    options: [pageOptions],
  });
});

test('[B7] reports a function exported through a specifier under a name allowExports does not list', async () => {
  await rule.invalid({
    code: ['function helper() { return 1; }', 'export { helper };'].join('\n'),
    filename: handlerFile,
    options: [routeOptions],
    errors: 1,
  });
});

test('[S3] does not report generateMetadata in page.tsx with the options configs.next gives it', async () => {
  const [, ...options] = await nextConsumer.ruleEntry(pageFile, '@kai-tw/no-top-level-function');
  await rule.valid({
    code: 'export async function generateMetadata() { return {}; }',
    filename: pageFile,
    options,
  });
});

test('[S4] does not report a PascalCase function that returns a JSX element', async () => {
  await rule.valid({
    code: 'export function PriceTag() { return <span />; }',
    filename: componentFile,
    options: [componentOptions],
  });
});

test('[S4] does not report a PascalCase const arrow whose body is JSX', async () => {
  await rule.valid({
    code: 'const PriceTag = () => <span />;',
    filename: componentFile,
    options: [componentOptions],
  });
});

test('[S4] does not report a PascalCase arrow with a block body that returns JSX', async () => {
  await rule.valid({
    code: 'const PriceTag = () => { return <span />; };',
    filename: componentFile,
    options: [componentOptions],
  });
});

test('[S4] does not report a PascalCase function that returns a fragment', async () => {
  await rule.valid({
    code: 'export function PriceTag() { return <></>; }',
    filename: componentFile,
    options: [componentOptions],
  });
});

test('[S4] does not report a PascalCase function whose one return is JSX among others', async () => {
  await rule.valid({
    code: [
      'export function PriceTag({ price }: { price: number | null }) {',
      '  if (price === null) return null;',
      '  return <span>{price}</span>;',
      '}',
    ].join('\n'),
    filename: componentFile,
    options: [componentOptions],
  });
});

test('[S4] does not report a PascalCase function returning a conditional with a JSX branch', async () => {
  await rule.valid({
    code: 'export function PriceTag({ shown }: { shown: boolean }) { return shown ? <span /> : null; }',
    filename: componentFile,
    options: [componentOptions],
  });
});

test('[S4] does not report a PascalCase function returning a conditional whose JSX is only in the alternate', async () => {
  await rule.valid({
    code: 'export function PriceTag({ shown }: { shown: boolean }) { return shown ? null : <span />; }',
    filename: componentFile,
    options: [componentOptions],
  });
});

test('[S4] does not report a PascalCase arrow returning a logical expression with a JSX operand', async () => {
  await rule.valid({
    code: 'const PriceTag = ({ shown }: { shown: boolean }) => shown && <span />;',
    filename: componentFile,
    options: [componentOptions],
  });
});

test('[S4] reports a lowercase function that returns JSX', async () => {
  await rule.invalid({
    code: 'export function priceTag() { return <span />; }',
    filename: componentFile,
    options: [componentOptions],
    errors: 1,
  });
});

test('[S4] reports a PascalCase function that does not return JSX', async () => {
  await rule.invalid({
    code: "export function PriceTag() { return 'tag'; }",
    filename: componentFile,
    options: [componentOptions],
    errors: 1,
  });
});

test('[S4] reports a PascalCase function that only passes JSX as an argument', async () => {
  await rule.invalid({
    code: 'export function PriceTag() { return new Frame(<span />); }',
    filename: componentFile,
    options: [componentOptions],
    errors: 1,
  });
});

test('[S4] reports a PascalCase function whose JSX is returned only by a nested function', async () => {
  await rule.invalid({
    code: [
      'export function PriceTag() {',
      '  const label = () => <span />;',
      '  return label;',
      '}',
    ].join('\n'),
    filename: componentFile,
    options: [componentOptions],
    errors: 1,
  });
});

test('[S4] reports a PascalCase function whose JSX return statement is inside a nested function', async () => {
  await rule.invalid({
    code: [
      'export function PriceTag() {',
      '  const label = () => {',
      '    return <span />;',
      '  };',
      '  return label;',
      '}',
    ].join('\n'),
    filename: componentFile,
    options: [componentOptions],
    errors: [{ messageId: 'topLevelFunction', line: 1 }],
  });
});

test('[S4] reports a component when no options are given', async () => {
  await rule.invalid({
    code: 'export function PriceTag() { return <span />; }',
    filename: componentFile,
    errors: 1,
  });
});

test('[S7] does not report GET and POST named by allowExports in route.ts', async () => {
  await rule.valid({
    code: [
      'export async function GET() { return new Response(); }',
      'export async function POST() { return new Response(); }',
    ].join('\n'),
    filename: handlerFile,
    options: [routeOptions],
  });
});

test('[S7] reports a helper beside GET in route.ts', async () => {
  await rule.invalid({
    code: [
      'export async function GET() { return new Response(); }',
      'async function parseWidget(request: Request) { return request.text(); }',
    ].join('\n'),
    filename: handlerFile,
    options: [routeOptions],
    errors: 1,
  });
});

test('[S7] reports an HTTP method that allowExports does not list', async () => {
  await rule.invalid({
    code: 'export async function PUT() { return new Response(); }',
    filename: handlerFile,
    options: [routeOptions],
    errors: 1,
  });
});

test('[S7] does not report the default export of robots.ts', async () => {
  await rule.valid({
    code: 'export default function robots() { return { rules: [] }; }',
    filename: 'app/robots.ts',
    options: [defaultExportOptions],
  });
});

test('[S7] reports a helper beside the default export of sitemap.ts', async () => {
  await rule.invalid({
    code: [
      'export default function sitemap() { return []; }',
      'function toEntry(path: string) { return { url: path }; }',
    ].join('\n'),
    filename: 'app/sitemap.ts',
    options: [defaultExportOptions],
    errors: 1,
  });
});

test('[S7] does not report a default export of opengraph-image.tsx that passes JSX to a constructor', async () => {
  await rule.valid({
    code: 'export default function Image() { return new ImageFrame(<div />); }',
    filename: 'app/x/opengraph-image.tsx',
    options: [imageOptions],
  });
});

test('[S7] reports a helper beside the default export of opengraph-image.tsx', async () => {
  await rule.invalid({
    code: [
      'export default function Image() { return new ImageFrame(<div />); }',
      'function readTitle() { return "widget"; }',
    ].join('\n'),
    filename: 'app/x/opengraph-image.tsx',
    options: [imageOptions],
    errors: 1,
  });
});

test('[B2] does not report an export default async function in page.tsx', async () => {
  await rule.valid({
    code: 'export default async function Page() { return <main />; }',
    filename: pageFile,
    options: [pageOptions],
  });
});

test('[B2] does not report an export default arrow function in page.tsx', async () => {
  await rule.valid({
    code: 'export default () => <main />;',
    filename: pageFile,
    options: [pageOptions],
  });
});

test('[B2] reports an export default async function in a plain file', async () => {
  await rule.invalid({
    code: 'export default async function load() { return 1; }',
    filename: plainFile,
    errors: 1,
  });
});

test('[B2] reports an export default arrow function in a plain file', async () => {
  await rule.invalid({ code: 'export default () => 1;', filename: plainFile, errors: 1 });
});

test('[B4] does not report generateMetadata or a PascalCase component in one page.tsx with the options configs.next gives it', async () => {
  const [, ...options] = await nextConsumer.ruleEntry(pageFile, '@kai-tw/no-top-level-function');
  await rule.valid({
    code: [
      'function Heading() { return <h1 />; }',
      'export async function generateMetadata() { return {}; }',
      'export default function Page() { return <Heading />; }',
    ].join('\n'),
    filename: pageFile,
    options,
  });
});

test('[B6] does not report a default export that is the result of a call taking an async arrow', async () => {
  await rule.valid({
    code: 'export default wrapTask(async () => ({ total: 1 }));',
    filename: plainFile,
  });
});

test('[B6] does not report a top-level const bound to the result of a call taking an arrow', async () => {
  await rule.valid({ code: 'const lanternTask = wrapTask(() => 1);', filename: plainFile });
});

test('[B6] does not report an exported const bound to the result of a call taking an arrow', async () => {
  await rule.valid({
    code: 'export const lanternTask = wrapTask(() => 1);',
    filename: plainFile,
  });
});

test('[B6] reports only the top-level arrow function beside call results in one file', async () => {
  await rule.invalid({
    code: [
      'export default wrapTask(async () => ({ total: 1 }));',
      'const lanternTask = wrapTask(() => 1);',
      'const total = () => 1;',
    ].join('\n'),
    filename: plainFile,
    errors: [{ messageId: 'topLevelFunction', line: 3 }],
  });
});
