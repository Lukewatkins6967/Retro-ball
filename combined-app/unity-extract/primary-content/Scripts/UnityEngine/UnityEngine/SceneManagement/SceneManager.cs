using System;
using System.Runtime.CompilerServices;
using UnityEngine.Events;
using UnityEngine.Internal;
using UnityEngine.Scripting;

namespace UnityEngine.SceneManagement
{
	[RequiredByNativeCode]
	public class SceneManager
	{
		public static extern int sceneCount
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public static extern int sceneCountInBuildSettings
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public static event UnityAction<Scene, LoadSceneMode> sceneLoaded;

		public static event UnityAction<Scene> sceneUnloaded;

		public static event UnityAction<Scene, Scene> activeSceneChanged;

		public static Scene GetActiveScene()
		{
			Scene value;
			INTERNAL_CALL_GetActiveScene(out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetActiveScene(out Scene value);

		public static bool SetActiveScene(Scene scene)
		{
			return INTERNAL_CALL_SetActiveScene(ref scene);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool INTERNAL_CALL_SetActiveScene(ref Scene scene);

		public static Scene GetSceneByPath(string scenePath)
		{
			Scene value;
			INTERNAL_CALL_GetSceneByPath(scenePath, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetSceneByPath(string scenePath, out Scene value);

		public static Scene GetSceneByName(string name)
		{
			Scene value;
			INTERNAL_CALL_GetSceneByName(name, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetSceneByName(string name, out Scene value);

		public static Scene GetSceneAt(int index)
		{
			Scene value;
			INTERNAL_CALL_GetSceneAt(index, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_GetSceneAt(int index, out Scene value);

		[Obsolete("Use SceneManager.sceneCount and SceneManager.GetSceneAt(int index) to loop the all scenes instead.")]
		public static Scene[] GetAllScenes()
		{
			Scene[] array = new Scene[sceneCount];
			for (int i = 0; i < sceneCount; i++)
			{
				array[i] = GetSceneAt(i);
			}
			return array;
		}

		[ExcludeFromDocs]
		public static void LoadScene(string sceneName)
		{
			LoadSceneMode mode = LoadSceneMode.Single;
			LoadScene(sceneName, mode);
		}

		public static void LoadScene(string sceneName, [DefaultValue("LoadSceneMode.Single")] LoadSceneMode mode)
		{
			LoadSceneAsyncNameIndexInternal(sceneName, -1, mode == LoadSceneMode.Additive, true);
		}

		[ExcludeFromDocs]
		public static void LoadScene(int sceneBuildIndex)
		{
			LoadSceneMode mode = LoadSceneMode.Single;
			LoadScene(sceneBuildIndex, mode);
		}

		public static void LoadScene(int sceneBuildIndex, [DefaultValue("LoadSceneMode.Single")] LoadSceneMode mode)
		{
			LoadSceneAsyncNameIndexInternal(null, sceneBuildIndex, mode == LoadSceneMode.Additive, true);
		}

		[ExcludeFromDocs]
		public static AsyncOperation LoadSceneAsync(string sceneName)
		{
			LoadSceneMode mode = LoadSceneMode.Single;
			return LoadSceneAsync(sceneName, mode);
		}

		public static AsyncOperation LoadSceneAsync(string sceneName, [DefaultValue("LoadSceneMode.Single")] LoadSceneMode mode)
		{
			return LoadSceneAsyncNameIndexInternal(sceneName, -1, mode == LoadSceneMode.Additive, false);
		}

		[ExcludeFromDocs]
		public static AsyncOperation LoadSceneAsync(int sceneBuildIndex)
		{
			LoadSceneMode mode = LoadSceneMode.Single;
			return LoadSceneAsync(sceneBuildIndex, mode);
		}

		public static AsyncOperation LoadSceneAsync(int sceneBuildIndex, [DefaultValue("LoadSceneMode.Single")] LoadSceneMode mode)
		{
			return LoadSceneAsyncNameIndexInternal(null, sceneBuildIndex, mode == LoadSceneMode.Additive, false);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern AsyncOperation LoadSceneAsyncNameIndexInternal(string sceneName, int sceneBuildIndex, bool isAdditive, bool mustCompleteNextFrame);

		public static Scene CreateScene(string sceneName)
		{
			Scene value;
			INTERNAL_CALL_CreateScene(sceneName, out value);
			return value;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_CreateScene(string sceneName, out Scene value);

		public static bool UnloadScene(int sceneBuildIndex)
		{
			return UnloadSceneNameIndexInternal(string.Empty, sceneBuildIndex);
		}

		public static bool UnloadScene(string sceneName)
		{
			return UnloadSceneNameIndexInternal(sceneName, -1);
		}

		public static bool UnloadScene(Scene scene)
		{
			return INTERNAL_CALL_UnloadScene(ref scene);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool INTERNAL_CALL_UnloadScene(ref Scene scene);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern bool UnloadSceneNameIndexInternal(string sceneName, int sceneBuildIndex);

		public static void MergeScenes(Scene sourceScene, Scene destinationScene)
		{
			INTERNAL_CALL_MergeScenes(ref sourceScene, ref destinationScene);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_MergeScenes(ref Scene sourceScene, ref Scene destinationScene);

		public static void MoveGameObjectToScene(GameObject go, Scene scene)
		{
			INTERNAL_CALL_MoveGameObjectToScene(go, ref scene);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_MoveGameObjectToScene(GameObject go, ref Scene scene);

		[RequiredByNativeCode]
		private static void Internal_SceneLoaded(Scene scene, LoadSceneMode mode)
		{
			if (SceneManager.sceneLoaded != null)
			{
				SceneManager.sceneLoaded(scene, mode);
			}
		}

		[RequiredByNativeCode]
		private static void Internal_SceneUnloaded(Scene scene)
		{
			if (SceneManager.sceneUnloaded != null)
			{
				SceneManager.sceneUnloaded(scene);
			}
		}

		[RequiredByNativeCode]
		private static void Internal_ActiveSceneChanged(Scene previousActiveScene, Scene newActiveScene)
		{
			if (SceneManager.activeSceneChanged != null)
			{
				SceneManager.activeSceneChanged(previousActiveScene, newActiveScene);
			}
		}
	}
}
