/**
 * Reddit-inspired social app — IIT414 final project (Group 5).
 * UI-only milestone: mock data, no Firebase wired yet.
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {PostsProvider} from './src/context/PostsContext';
import RootNavigator from './src/navigation';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <PostsProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </PostsProvider>
    </SafeAreaProvider>
  );
}

export default App;
