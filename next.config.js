/** @type {import('next').NextConfig} */
const nextConfig = {
    // Using Next.js built-in CSS support instead of custom webpack config
    webpack: (config, { dev, isServer }) => {
        // Disable webpack cache in development mode to prevent corruption issues
        if (dev) {
            config.cache = false;
        }

        return config;
    },
    // Add more stability to the build process
    onDemandEntries: {
        // Keep the build page in memory for longer periods
        maxInactiveAge: 60 * 60 * 1000, // 1 hour
        // Number of pages that should be kept simultaneously without being disposed
        pagesBufferLength: 5,
    },
    // Disable ESLint during build to avoid configuration issues
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Configure allowed image domains for Next.js Image component
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            },
        ],
    }
};

module.exports = nextConfig; 