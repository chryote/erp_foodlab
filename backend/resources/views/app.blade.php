<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'PT. Slaras Nusa Foodlab') }}</title>
</head>
<body class="min-h-screen bg-background text-foreground antialiased">
    <div id="root"></div>
    <script type="module" src="{{ env('FRONTEND_DEV_URL', 'http://localhost:5173') }}/src/main.tsx"></script>
</body>
</html>
