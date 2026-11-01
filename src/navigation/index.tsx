import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon, {IconName} from '../components/Icon';
import {usePosts} from '../context/PostsContext';
import {C} from '../theme';
import CommunitiesScreen from '../screens/CommunitiesScreen';
import CommunityScreen from '../screens/CommunityScreen';
import CreateCommunityScreen from '../screens/CreateCommunityScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import AskScreen from '../screens/AskScreen';
import HomeScreen from '../screens/HomeScreen';
import InboxScreen from '../screens/InboxScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SignInScreen from '../screens/SignInScreen';
import {RootStackParamList, TabParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, IconName> = {
  Home: 'home',
  Communities: 'grid',
  Create: 'plus',
  Ask: 'sparkle',
  Inbox: 'bell',
  Profile: 'user',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: C.orange,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: C.hairline,
        },
        tabBarLabelStyle: {fontSize: 10, fontWeight: '600'},
        tabBarIcon: ({color, size}) => (
          <Icon
            name={TAB_ICONS[route.name]}
            color={color}
            size={route.name === 'Create' ? 24 : 20}
          />
        ),
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Communities" component={CommunitiesScreen} />
      <Tab.Screen name="Create" component={CreatePostScreen} />
      <Tab.Screen
        name="Ask"
        component={AskScreen}
        options={{tabBarLabel: 'Ask AI'}}
      />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/** Sign-in gate: unauthenticated users only ever see SignIn. */
export default function RootNavigator() {
  const {signedIn} = usePosts();
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {signedIn ? (
        <>
          <Stack.Screen name="Main" component={Tabs} />
          <Stack.Screen name="Community" component={CommunityScreen} />
          <Stack.Screen name="CreateCommunity" component={CreateCommunityScreen} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        </>
      ) : (
        <Stack.Screen name="SignIn" component={SignInScreen} />
      )}
    </Stack.Navigator>
  );
}
