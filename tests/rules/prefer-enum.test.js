import { test } from 'node:test';
import { RuleCase } from '../support/rule-case.js';

const rule = new RuleCase('prefer-enum');

const parcelFile = 'src/domain/parcel.ts';

test('[S5] reports an object literal marked as const', async () => {
  await rule.invalid({
    code: "const ParcelStatus = { sent: 'sent' } as const;",
    filename: parcelFile,
    errors: [{ messageId: 'constAssertion' }],
  });
});

test('[S5] reports an exported object literal marked as const', async () => {
  await rule.invalid({
    code: "export const ParcelStatus = { sent: 'sent', stowed: 'stowed' } as const;",
    filename: parcelFile,
    errors: [{ messageId: 'constAssertion' }],
  });
});

test('[S5] reports the as const object that stands in for a string enum', async () => {
  await rule.invalid({
    code: "const KiteShapes = { delta: 'delta', box: 'box' } as const;",
    filename: parcelFile,
    errors: [{ messageId: 'constAssertion' }],
  });
});

test('[S5] reports an object literal of numbers marked as const', async () => {
  await rule.invalid({
    code: 'const InvoiceDueDays = { first: 1 } as const;',
    filename: parcelFile,
    errors: [{ messageId: 'constAssertion' }],
  });
});

test('[S5] reports an array literal marked as const', async () => {
  await rule.invalid({
    code: "const sizes = ['S', 'M'] as const;",
    filename: parcelFile,
    errors: [{ messageId: 'constAssertion' }],
  });
});

test('[S5] reports a named type that is a union of string literals', async () => {
  await rule.invalid({
    code: "type ParcelSize = 'S' | 'M';",
    filename: parcelFile,
    errors: [{ messageId: 'stringUnion' }],
  });
});

test('[S5] reports an exported named union of three string literals', async () => {
  await rule.invalid({
    code: "export type ParcelSize = 'S' | 'M' | 'L';",
    filename: parcelFile,
    errors: [{ messageId: 'stringUnion' }],
  });
});

test('[S5] reports an inline union of string literals in a parameter type', async () => {
  await rule.invalid({
    code: "export class Lantern { ship(size: 'S' | 'M'): void {} }",
    filename: parcelFile,
    errors: [{ messageId: 'stringUnion' }],
  });
});

test('[S5] does not report a numeric enum', async () => {
  await rule.valid({ code: 'enum InvoiceDueDay { first = 1 }', filename: parcelFile });
});

test('[S5] does not report the string enum that replaces an as const object', async () => {
  await rule.valid({
    code: "enum KiteShape { delta = 'delta', box = 'box' }",
    filename: parcelFile,
  });
});

test('[S5] does not report a string enum', async () => {
  await rule.valid({
    code: "export enum ParcelStatus { Sent = 'sent', Stowed = 'stowed' }",
    filename: parcelFile,
  });
});

test('[S5] does not report a string literal marked as const', async () => {
  await rule.valid({ code: "const region = 'coastal' as const;", filename: parcelFile });
});

test('[S5] does not report an object literal without as const', async () => {
  await rule.valid({ code: "const parcelDefaults = { size: 'S' };", filename: parcelFile });
});

test('[S5] does not report a union that mixes a string literal with another type', async () => {
  await rule.valid({ code: "type ParcelKey = 'S' | number;", filename: parcelFile });
});

test('[S5] does not report a union of numeric literals', async () => {
  await rule.valid({ code: 'type ParcelCount = 1 | 2;', filename: parcelFile });
});

// The suggested enum keeps the union's own empty member at the use site.
const keepsNull = /^(?=[\s\S]*\benum\b)(?=[\s\S]*\|\s*null\b)(?![\s\S]*\|\s*undefined\b)/i;
const keepsUndefined = /^(?=[\s\S]*\benum\b)(?=[\s\S]*\|\s*undefined\b)(?![\s\S]*\|\s*null\b)/i;

test('[B5] reports a named union of string literals and null, keeping | null at the use site', async () => {
  await rule.invalid({
    code: "type ParcelSize = 'S' | 'M' | null;",
    filename: parcelFile,
    errors: [{ message: keepsNull }],
  });
});

test('[B5] reports an inline union of string literals and undefined, keeping | undefined at the use site', async () => {
  await rule.invalid({
    code: "let size: 'S' | 'M' | undefined;",
    filename: parcelFile,
    errors: [{ message: keepsUndefined }],
  });
});

test('[B5] reports a named union of string literals and undefined, keeping | undefined at the use site', async () => {
  await rule.invalid({
    code: "export type ParcelSize = 'S' | 'M' | undefined;",
    filename: parcelFile,
    errors: [{ message: keepsUndefined }],
  });
});

test('[B5] reports an inline union of string literals and null in a parameter type, keeping | null', async () => {
  await rule.invalid({
    code: "export class Lantern { ship(size: 'S' | 'M' | null): void {} }",
    filename: parcelFile,
    errors: [{ message: keepsNull }],
  });
});

test('[B5] does not report a single string literal with null', async () => {
  await rule.valid({ code: "type ParcelMark = 'S' | null;", filename: parcelFile });
});

test('[B5] does not report a single string literal with undefined', async () => {
  await rule.valid({ code: "let mark: 'S' | undefined;", filename: parcelFile });
});

test('[B5] does not report string literals mixed with another type', async () => {
  await rule.valid({ code: "type ParcelWeight = 'S' | 'M' | number;", filename: parcelFile });
});
