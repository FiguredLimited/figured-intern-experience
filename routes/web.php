<?php

use App\Http\Controllers\FinancialReportController;
use App\Http\Controllers\MarkdownController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

Route::get('/challenge', function () {
    return Inertia::render('Challenge');
})->name('challenge');

Route::get('/easy-mode', function () {
    return Inertia::render('EasyMode');
})->name('easy-mode');

Route::get('/api/financial-report', [FinancialReportController::class, 'getFinancialReport'])
    ->name('api.financial-report');

Route::post('/api/generate-commentary', [FinancialReportController::class, 'generateCommentary'])
    ->name('api.generate-commentary');

Route::get('/CHALLENGE.md', [MarkdownController::class, 'showChallenge'])
    ->name('challenge.md');
