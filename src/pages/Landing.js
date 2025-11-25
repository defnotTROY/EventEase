import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  QrCode,
  BarChart3,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Clock,
  TrendingUp,
  Sparkle,
  CalendarClock
} from 'lucide-react';
import { appConfig } from '../config/appConfig';

const Landing = () => {
  const features = [
    {
      icon: Calendar,
      title: 'Event Management',
      description: 'Create, edit, and manage events with details like date, time, location, and capacity. Automatic status updates keep your events organized.'
    },
    {
      icon: QrCode,
      title: 'QR Code Check-in',
      description: 'Permanent QR codes for users, admin scanner for check-ins, and manual check-in options. Export check-in lists as CSV.'
    },
    {
      icon: Sparkle,
      title: 'AI Personalized Event Recommendations',
      description: 'Get personalized event suggestions based on your preferences, history, and interests. Our AI analyzes your behavior to recommend events you\'ll love with confidence scores.'
    },
    {
      icon: CalendarClock,
      title: 'AI Event Scheduler',
      description: 'Automatically generate professional event schedules that balance sessions, breaks, and networking time. Adapts to event type and participant count for optimal flow.'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Track event performance, engagement rates, participant demographics, and get data-driven insights for improvement.'
    },
    {
      icon: Users,
      title: 'Participant Management',
      description: 'Track registrations, manage participant status (registered/attended/cancelled), and view detailed participant lists.'
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Sign Up & Verify',
      description: 'Create your account and complete verification to ensure secure access.',
      icon: ShieldCheck
    },
    {
      step: 2,
      title: 'Create Events',
      description: 'Set up your events with all the details - date, time, location, and more.',
      icon: Calendar
    },
    {
      step: 3,
      title: 'Manage Participants',
      description: 'Track registrations, check-ins, and engagement with real-time updates.',
      icon: Users
    },
    {
      step: 4,
      title: 'Analyze & Improve',
      description: 'View analytics, track engagement, and use insights to optimize your future events.',
      icon: TrendingUp
    }
  ];

  const benefits = [
    {
      icon: Clock,
      title: 'Save Time',
      description: 'Automate repetitive tasks and focus on what matters most.'
    },
    {
      icon: TrendingUp,
      title: 'Increase Engagement',
      description: 'Boost participant engagement with smart features and insights.'
    },
    {
      icon: ShieldCheck,
      title: 'Secure Platform',
      description: 'Built with security and verification at its core.'
    },
    {
      icon: BarChart3,
      title: 'Data-Driven',
      description: 'Make informed decisions with comprehensive analytics and insights.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-primary-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">{appConfig.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-primary-600 px-4 py-2 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4 mr-2" />
                Smart Event Management Platform
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Smart Event Management
              <br />
              <span className="text-primary-600">Made Simple</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {appConfig.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
              >
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 border-2 border-primary-600 rounded-lg hover:bg-primary-50 font-semibold text-lg transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Events
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to make event management effortless and efficient
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-gray-50 rounded-xl hover:shadow-lg transition-all border border-gray-200 hover:border-primary-300"
                >
                  <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes and transform how you manage events
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="relative">
                  <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200">
                    <div className="flex items-center mb-4">
                      <div className="bg-primary-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg mr-3">
                        {item.step}
                      </div>
                      <Icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600">
                      {item.description}
                    </p>
                  </div>
                  {index < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ArrowRight className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose {appConfig.name}?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the difference with our comprehensive event management solution
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center">
                  <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Highlights Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-primary-100">Secure & Verified</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">Real-time</div>
              <div className="text-primary-100">Status Updates</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">Easy</div>
              <div className="text-primary-100">QR Check-in</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Events?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Start managing your events today with {appConfig.name}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
            >
                Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 border-2 border-primary-600 rounded-lg hover:bg-primary-50 font-semibold text-lg transition-all"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <Calendar className="h-6 w-6 text-primary-400 mr-2" />
                <span className="text-xl font-bold">{appConfig.name}</span>
              </div>
              <p className="text-gray-400 text-sm">
                {appConfig.description}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/events" className="hover:text-white transition-colors">Events</Link></li>
                <li><Link to="/analytics" className="hover:text-white transition-colors">Analytics</Link></li>
                <li><Link to="/participants" className="hover:text-white transition-colors">Participants</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-primary-400" />
                  QR Code Check-in
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-primary-400" />
                  User Verification
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-primary-400" />
                  Analytics Dashboard
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-primary-400" />
                  Auto Status Updates
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} {appConfig.name}. All rights reserved.</p>
            <p className="mt-2">{appConfig.features.aiEnabled && appConfig.features.cloudEnabled ? 'Powered by AI & Cloud' : 'Powered by EventEase'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

