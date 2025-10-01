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

test('ER_peroxisome recipe displays correct default values', async () => {
    const recipe = await getFirebaseRecipe('ER_peroxisome_v_struct_gradient_370574');
    
    expect(recipe.name).toBe('ER_peroxisome');
    expect(recipe.version).toBe('struct_gradient_370574');
    expect(recipe.format_version).toBe('2.1');
    expect(recipe.bounding_box).toEqual([
        [33.775, 35.375, 7.125],
        [274.225, 208.625, 106.875]
    ]);
    
    expect(recipe.composition?.membrane?.count).toBe(1);
    expect(recipe.composition?.nucleus?.count).toBe(1);
    expect(recipe.composition?.struct?.count).toBe(1);
    
    expect(recipe.objects?.peroxisome?.radius).toBe(2.37);
    expect(recipe.objects?.peroxisome?.packing_mode).toBe('gradient');
    expect(recipe.objects?.peroxisome?.gradient).toBe('struct_gradient');
    
    expect(recipe.gradients?.struct_gradient?.mode).toBe('surface');
    expect(recipe.gradients?.struct_gradient?.pick_mode).toBe('linear');
    expect(recipe.gradients?.struct_gradient?.weight_mode).toBe('exponential');
});

test('one_sphere recipe displays correct default values', async () => {
    const recipe = await getFirebaseRecipe('one_sphere_v_1.0.0');
    
    expect(recipe.name).toBe('one_sphere');
    expect(recipe.version).toBe('1.0.0');
    expect(recipe.format_version).toBe('2.1');
    expect(recipe.bounding_box).toEqual([
        [0, 0, 0],
        [20, 20, 20]
    ]);
    
    expect(recipe.objects?.base?.packing_mode).toBe('random');
    expect(recipe.objects?.base?.place_method).toBe('spheresSST');
    expect(recipe.objects?.base?.jitter_attempts).toBe(10);
    expect(recipe.objects?.base?.rejection_threshold).toBe(50);
    
    expect(recipe.objects?.sphere_25?.type).toBe('single_sphere');
    expect(recipe.objects?.sphere_25?.radius).toBe(5);
    expect(recipe.objects?.sphere_25?.inherit).toBe('base');
    
    expect(recipe.composition?.A?.count).toBe(1);
    expect(recipe.composition?.A?.object).toBe('sphere_25');
});