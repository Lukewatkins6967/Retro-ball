using System;
using System.Collections.Generic;
using UnityEngine;

public class SystemTime : Singleton<SystemTime>
{
	private class tTimeScaleMultiplier
	{
		public float m_mult = 1f;

		public float m_time;
	}

	private static int m_layersNoPause = -1;

	private Dictionary<string, tTimeScaleMultiplier> m_timeScaleMultipliers = new Dictionary<string, tTimeScaleMultiplier>();

	private float m_timeSinceLastFrame;

	private float m_timeFixedOriginal = 0.1f;

	private float m_debugTimeMultiplier = 1f;

	private bool m_gamePaused;

	private int m_pauseRefCount;

	private List<MonoBehaviour> m_pausedComponents = new List<MonoBehaviour>();

	private List<Rigidbody> m_pausedBodies = new List<Rigidbody>();

	private List<Vector3> m_pausedVelocities = new List<Vector3>();

	private List<Action> m_actionsOnPause = new List<Action>();

	private List<Action> m_actionsOnUnpause = new List<Action>();

	public static bool Paused
	{
		get
		{
			if ((bool)Singleton<SystemTime>.m_instance)
			{
				return Singleton<SystemTime>.m_instance.m_gamePaused;
			}
			return false;
		}
	}

	public static void PauseGame()
	{
		Singleton<SystemTime>.m_instance.m_gamePaused = true;
		Singleton<SystemTime>.m_instance.m_pauseRefCount++;
		GameObject[] array = UnityEngine.Object.FindObjectsOfType(typeof(GameObject)) as GameObject[];
		GameObject gameObject = null;
		bool flag = false;
		MonoBehaviour[] array2 = null;
		int num = 0;
		MonoBehaviour monoBehaviour = null;
		int num2 = array.Length;
		for (int i = 0; i < num2; i++)
		{
			gameObject = array[i];
			if (!gameObject.activeInHierarchy || !IsLayerPauseable(gameObject.layer))
			{
				continue;
			}
			if (gameObject.GetComponent<Rigidbody>() != null && !gameObject.GetComponent<Rigidbody>().isKinematic)
			{
				Singleton<SystemTime>.m_instance.m_pausedVelocities.Add(gameObject.GetComponent<Rigidbody>().velocity);
				Singleton<SystemTime>.m_instance.m_pausedBodies.Add(gameObject.GetComponent<Rigidbody>());
				gameObject.GetComponent<Rigidbody>().isKinematic = true;
			}
			flag = gameObject.GetComponent<Renderer>() != null && (flag = gameObject.GetComponent<Renderer>().enabled);
			array2 = gameObject.GetComponents<MonoBehaviour>();
			num = array2.Length;
			for (int j = 0; j < num; j++)
			{
				monoBehaviour = array2[j];
				if (monoBehaviour.enabled)
				{
					Singleton<SystemTime>.m_instance.m_pausedComponents.Add(monoBehaviour);
					monoBehaviour.enabled = false;
				}
			}
			if (flag)
			{
				gameObject.GetComponent<Renderer>().enabled = true;
			}
		}
		foreach (Action item in Singleton<SystemTime>.m_instance.m_actionsOnPause)
		{
			item();
		}
	}

	public static void UnPauseGame()
	{
		Singleton<SystemTime>.m_instance.m_pauseRefCount--;
		if (Debug.isDebugBuild && Singleton<SystemTime>.m_instance.m_pauseRefCount < 0)
		{
			Debug.LogError("Pause ref count mismatch");
		}
		if (Singleton<SystemTime>.m_instance.m_pauseRefCount == 0)
		{
			MonoBehaviour monoBehaviour = null;
			int count = Singleton<SystemTime>.m_instance.m_pausedComponents.Count;
			for (int i = 0; i < count; i++)
			{
				monoBehaviour = Singleton<SystemTime>.m_instance.m_pausedComponents[i];
				if (monoBehaviour != null)
				{
					monoBehaviour.enabled = true;
				}
			}
			Singleton<SystemTime>.m_instance.m_pausedComponents.Clear();
			Rigidbody rigidbody = null;
			count = Singleton<SystemTime>.m_instance.m_pausedBodies.Count;
			for (int j = 0; j < count; j++)
			{
				rigidbody = Singleton<SystemTime>.m_instance.m_pausedBodies[j];
				if (rigidbody != null)
				{
					rigidbody.isKinematic = false;
					rigidbody.velocity = Singleton<SystemTime>.m_instance.m_pausedVelocities[j];
					rigidbody.WakeUp();
				}
			}
			Singleton<SystemTime>.m_instance.m_pausedBodies.Clear();
			Singleton<SystemTime>.m_instance.m_pausedVelocities.Clear();
			Singleton<SystemTime>.m_instance.m_gamePaused = false;
		}
		foreach (Action item in Singleton<SystemTime>.m_instance.m_actionsOnUnpause)
		{
			item();
		}
	}

	public static float GetTimeScale()
	{
		return Time.timeScale / Singleton<SystemTime>.m_instance.m_debugTimeMultiplier;
	}

	public static float GetUnscaledDeltaTime()
	{
		return Time.unscaledDeltaTime * Singleton<SystemTime>.m_instance.m_debugTimeMultiplier;
	}

	public static void SlowMoPause(string source, float time)
	{
		tTimeScaleMultiplier tTimeScaleMultiplier2 = new tTimeScaleMultiplier();
		tTimeScaleMultiplier2.m_time = time;
		tTimeScaleMultiplier2.m_mult = 0.001f;
		Singleton<SystemTime>.m_instance.m_timeScaleMultipliers[source] = tTimeScaleMultiplier2;
	}

	public static void SlowMoBegin(string source, float scale, float time)
	{
		Singleton<SystemTime>.m_instance.m_timeScaleMultipliers[source] = new tTimeScaleMultiplier
		{
			m_mult = scale,
			m_time = time
		};
	}

	public static void SlowMoBegin(string source, float scale)
	{
		Singleton<SystemTime>.m_instance.m_timeScaleMultipliers[source] = new tTimeScaleMultiplier
		{
			m_mult = scale,
			m_time = -1f
		};
	}

	public static void SlowMoEnd(string source)
	{
		Singleton<SystemTime>.m_instance.m_timeScaleMultipliers.Remove(source);
	}

	public static void SlowMoClear()
	{
		Singleton<SystemTime>.m_instance.ClearTimeMultipliers();
	}

	public static void SetDebugTimeMultiplier(float multiplier)
	{
		Singleton<SystemTime>.m_instance.m_debugTimeMultiplier = multiplier;
	}

	public static float GetDebugTimeMultiplier()
	{
		return Singleton<SystemTime>.m_instance.m_debugTimeMultiplier;
	}

	public static bool TimePassed(float period)
	{
		return Time.timeSinceLevelLoad % period < (Time.timeSinceLevelLoad - Time.deltaTime) % period;
	}

	public static bool TimePassedFixed(float period)
	{
		return Time.timeSinceLevelLoad % period < (Time.timeSinceLevelLoad - Time.fixedDeltaTime) % period;
	}

	public static bool TimePassedFixed(float period, float offsetRatio)
	{
		float num = period * offsetRatio + Time.timeSinceLevelLoad;
		return num % period < (num - Time.fixedDeltaTime) % period;
	}

	public void RegisterPauseCallbacks(Action onPause, Action onUnPause)
	{
		m_actionsOnPause.Add(onPause);
		m_actionsOnUnpause.Add(onUnPause);
	}

	public void UnregisterPauseCallbacks(UnityEngine.Object obj)
	{
		m_actionsOnPause.RemoveAll((Action toRemove) => (UnityEngine.Object)toRemove.Target == obj);
		m_actionsOnUnpause.RemoveAll((Action toRemove) => (UnityEngine.Object)toRemove.Target == obj);
	}

	public void UnregisterPauseCallbacks(Action onPause, Action onUnPause)
	{
		m_actionsOnPause.RemoveAll((Action toRemove) => toRemove == onPause);
		m_actionsOnUnpause.RemoveAll((Action toRemove) => toRemove == onUnPause);
	}

	private void Awake()
	{
		SetSingleton();
		UnityEngine.Object.DontDestroyOnLoad(this);
		m_timeFixedOriginal = Time.fixedDeltaTime;
	}

	private void Update()
	{
		UpdateTimeMultipliers();
		if (Debug.isDebugBuild)
		{
			if (Input.GetKey(KeyCode.Tab) && Input.GetKeyDown(KeyCode.PageDown))
			{
				SetDebugTimeMultiplier(GetDebugTimeMultiplier() * 0.8f);
			}
			if (Input.GetKey(KeyCode.Tab) && Input.GetKeyDown(KeyCode.PageUp))
			{
				SetDebugTimeMultiplier(GetDebugTimeMultiplier() + 0.2f);
			}
			if (Input.GetKey(KeyCode.Tab) && Input.GetKeyDown(KeyCode.End))
			{
				SetDebugTimeMultiplier(1f);
			}
		}
	}

	private void ClearTimeMultipliers()
	{
		m_timeScaleMultipliers.Clear();
		Time.timeScale = 1f;
		Time.fixedDeltaTime = m_timeFixedOriginal * 1f;
	}

	private void UpdateTimeMultipliers()
	{
		float num = 1f;
		if (!m_gamePaused)
		{
			float num2 = Time.realtimeSinceStartup - m_timeSinceLastFrame;
			m_timeSinceLastFrame = Time.realtimeSinceStartup;
			List<string> list = new List<string>(m_timeScaleMultipliers.Keys);
			foreach (string item in list)
			{
				float time = m_timeScaleMultipliers[item].m_time;
				if (time > 0f)
				{
					time -= num2;
					if (time <= 0f)
					{
						m_timeScaleMultipliers.Remove(item);
						continue;
					}
					m_timeScaleMultipliers[item].m_time = time;
					num = Mathf.Min(num, m_timeScaleMultipliers[item].m_mult);
				}
				else
				{
					num = Mathf.Min(num, m_timeScaleMultipliers[item].m_mult);
				}
			}
		}
		num = (Time.timeScale = num * m_debugTimeMultiplier);
		Time.fixedDeltaTime = m_timeFixedOriginal * num;
	}

	public static bool IsLayerPauseable(int layer)
	{
		if (m_layersNoPause < 0)
		{
			int num = LayerMask.NameToLayer("UI");
			if (num > 0)
			{
				m_layersNoPause |= 1 << (num & 0x1F);
			}
			num = LayerMask.NameToLayer("NoPause");
			if (num > 0)
			{
				m_layersNoPause |= 1 << (num & 0x1F);
			}
		}
		return (m_layersNoPause & (1 << layer)) == 0;
	}
}
