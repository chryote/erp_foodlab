<?php

use App\Services\LabSampleService;

describe('LabSampleService quality grading', function () {
    it('returns PASS for samples within optimal pH and moisture thresholds', function () {
        $service = new LabSampleService();

        expect($service->evaluateQualityGrade(6.5, 85.0))->toBe('PASS')
            ->and($service->evaluateQualityGrade(4.2, 50.0))->toBe('PASS');
    });

    it('returns REVIEW for borderline pH or high moisture samples', function () {
        $service = new LabSampleService();

        expect($service->evaluateQualityGrade(3.5, 70.0))->toBe('REVIEW')
            ->and($service->evaluateQualityGrade(6.5, 95.0))->toBe('REVIEW');
    });

    it('returns REJECT for extreme acidity or alkalinity', function () {
        $service = new LabSampleService();

        expect($service->evaluateQualityGrade(2.1, 60.0))->toBe('REJECT')
            ->and($service->evaluateQualityGrade(9.4, 40.0))->toBe('REJECT');
    });

    it('throws InvalidArgumentException when pH or moisture is out of physical bounds', function () {
        $service = new LabSampleService();

        expect(fn () => $service->evaluateQualityGrade(-1.0, 50.0))
            ->toThrow(InvalidArgumentException::class, 'pH level must be between 0.0 and 14.0.')
            ->and(fn () => $service->evaluateQualityGrade(6.5, 105.0))
            ->toThrow(InvalidArgumentException::class, 'Moisture percentage must be between 0.0 and 100.0.');
    });
});
