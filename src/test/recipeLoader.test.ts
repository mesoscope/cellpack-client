import { expect, test } from 'vitest';
import fs from 'fs';
import { isFirebaseRef, getFirebaseRecipe, jsonToString } from '../utils/recipeLoader';

test('isFirebaseRef detects Firebase references correctly', () => {
    expect(isFirebaseRef('firebase:recipes/some_id')).toBe(true);
    expect(isFirebaseRef('firebase:configs/some_id')).toBe(true);
    expect(isFirebaseRef('not_a_firebase_ref')).toBe(false);
    expect(isFirebaseRef('local/file/path')).toBe(false);
    expect(isFirebaseRef(undefined)).toBe(false);
    expect(isFirebaseRef(null)).toBe(false);
});

test('getFirebaseRecipe works as expected for ER_peroxisome_v_struct_gradient_370574', async () => {
    const recipeId = 'ER_peroxisome_v_struct_gradient_370574';
    const recipeJson = await getFirebaseRecipe(recipeId);
    const recipeString = jsonToString(recipeJson);

    expect(recipeString).toBeDefined();
    expect(typeof recipeString).toBe('string');
    
    const parsedRecipe = JSON.parse(recipeString);
    expect(parsedRecipe.name).toBeDefined();
    expect(parsedRecipe.version).toBeDefined();

    const expectedRecipe = JSON.parse(fs.readFileSync('src/test/test-files/ER_peroxisome.json', 'utf8'));
    expect(parsedRecipe).toEqual(expectedRecipe);
});

test('getFirebaseRecipe works as expected for one_sphere', async () => {
    const recipeId = 'one_sphere_v_1.0.0';
    const recipeJson = await getFirebaseRecipe(recipeId);
    const recipeString = jsonToString(recipeJson);
    
    expect(recipeString).toBeDefined();
    expect(typeof recipeString).toBe('string');
    
    const parsedRecipe = JSON.parse(recipeString);
    expect(parsedRecipe.name).toBeDefined();
    expect(parsedRecipe.version).toBeDefined();

    const expectedRecipe = JSON.parse(fs.readFileSync('src/test/test-files/one_sphere.json', 'utf8'));
    expect(parsedRecipe).toEqual(expectedRecipe);
});

