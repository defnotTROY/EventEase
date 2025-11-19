import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  AlertCircle,
  FileText,
  Key,
  CheckCircle
} from 'lucide-react';

const CreateAdminAccount = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Shield className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Account Setup
            </h1>
            <p className="text-gray-600">
              Admin accounts are pre-configured for security
            </p>
          </div>

          {/* Alert */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-700">
                  <strong>Security Notice:</strong> Admin accounts are not created through the UI. 
                  They must be set up using the provided script or manually in Supabase.
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Setup Instructions
              </h2>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Option 1: Using Setup Script (Recommended)</h3>
                                     <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 ml-2">
                     <li>Get your Supabase Service Role Key from Dashboard &gt; Settings &gt; API</li>
                     <li>Set environment variables (see ADMIN_SETUP.md)</li>
                     <li>Run: <code className="bg-white px-2 py-1 rounded text-xs">node scripts/create-admin.js</code></li>
                     <li>Save the generated credentials securely</li>
                   </ol>
                 </div>
 
                 <div className="bg-gray-50 rounded-lg p-4">
                   <h3 className="font-medium text-gray-900 mb-2">Option 2: Manual Setup via Supabase Dashboard</h3>
                   <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 ml-2">
                     <li>Go to Supabase Dashboard &gt; Authentication &gt; Users</li>
                    <li>Create a new user with your admin email</li>
                    <li>Set user metadata: <code className="bg-white px-2 py-1 rounded text-xs">role: "Administrator"</code></li>
                    <li>See ADMIN_SETUP.md for detailed instructions</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Documentation Link */}
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Key className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-900 mb-1">Complete Setup Guide</h3>
                    <p className="text-sm text-yellow-800 mb-3">
                      For detailed instructions, see the <code className="bg-yellow-100 px-1 rounded">ADMIN_SETUP.md</code> file in the project root.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center text-xs text-yellow-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Step-by-step guide
                      </div>
                      <div className="flex items-center text-xs text-yellow-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Security best practices
                      </div>
                      <div className="flex items-center text-xs text-yellow-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Troubleshooting tips
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to="/login"
                className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Go to Login
              </Link>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Open Supabase Dashboard
              </a>
            </div>

            {/* Footer Note */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Need help? Check the <code className="bg-gray-100 px-1 rounded">ADMIN_SETUP.md</code> file for detailed instructions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAdminAccount;
