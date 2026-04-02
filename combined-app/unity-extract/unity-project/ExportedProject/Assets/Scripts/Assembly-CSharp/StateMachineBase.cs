using System;
using System.Collections.Generic;
using UnityEngine;

public class StateMachineBase<T> : MonoBehaviour where T : StateBase
{
	public static readonly string STR_MSGSETSTATE = "MsgSetState";

	[SerializeField]
	public List<T> m_states = new List<T>();

	protected int m_state = -1;

	private bool m_shouldQueueStateChange;

	private int m_stateQueued = -1;

	public Action<string> m_actionsUpdateState;

	public Action<string, string> m_actionsOnEnterState;

	public Action<string, string> m_actionsOnExitState;

	protected float m_stateTime;

	private int[] m_enumToIdMap;

	private int[] m_idToEnumMap;

	public void RegisterCallbacks(Action<string, string> onEnterState, Action<string, string> onExitState, Action<string> onUpdateState)
	{
		m_actionsOnEnterState = (Action<string, string>)Delegate.Combine(m_actionsOnEnterState, onEnterState);
		m_actionsOnExitState = (Action<string, string>)Delegate.Combine(m_actionsOnExitState, onExitState);
		m_actionsUpdateState = (Action<string>)Delegate.Combine(m_actionsUpdateState, onUpdateState);
	}

	public void RegisterUpdateCallback(Action<string> onUpdateState)
	{
		m_actionsUpdateState = (Action<string>)Delegate.Combine(m_actionsUpdateState, onUpdateState);
	}

	public void RegisterEnterCallback(Action<string, string> onEnterState)
	{
		m_actionsOnEnterState = (Action<string, string>)Delegate.Combine(m_actionsOnEnterState, onEnterState);
	}

	public void RegisterExitCallback(Action<string, string> onExitState)
	{
		m_actionsOnExitState = (Action<string, string>)Delegate.Combine(m_actionsOnExitState, onExitState);
	}

	public int GetState()
	{
		return m_state;
	}

	public T GetState(int i)
	{
		return m_states.ElementAtOrDefault(i);
	}

	public T GetState(string name)
	{
		return m_states.Find((T item) => item.m_name == name);
	}

	public string GetStateName()
	{
		return (m_state != -1) ? m_states[m_state].m_name : string.Empty;
	}

	public string GetStateName(int stateId)
	{
		return m_states.IsIndexValid(stateId) ? m_states[stateId].m_name : string.Empty;
	}

	public float GetStateTime()
	{
		return m_stateTime;
	}

	public int GetStateId(string stateName)
	{
		return m_states.FindIndex((T item) => item.m_name == stateName);
	}

	public virtual float GetStateTimeRemaining()
	{
		return -1f;
	}

	public virtual float GetStateTransitionTime(string stateName)
	{
		return 0f;
	}

	public void SetStateIfFound(string stateName)
	{
		int stateId = GetStateId(stateName);
		if (stateId != -1)
		{
			SetState(stateId);
		}
	}

	public void SetState(string stateName)
	{
		int stateId = GetStateId(stateName);
		if (stateId != -1)
		{
			SetState(stateId);
		}
		else if (Debug.isDebugBuild)
		{
			Debug.LogError("Tried to set invalid state name: " + stateName);
		}
	}

	public void SetState(int state)
	{
		if (m_shouldQueueStateChange)
		{
			QueueState(state);
			return;
		}
		m_shouldQueueStateChange = true;
		m_stateQueued = -1;
		int state2 = m_state;
		ExitState(state2, state);
		m_state = state;
		EnterState(state2, state);
		m_stateTime = 0f;
		m_shouldQueueStateChange = false;
		if (m_stateQueued != -1)
		{
			SetState(m_stateQueued);
		}
	}

	public void MsgSetState(string stateName)
	{
		SetState(stateName);
	}

	public void AnimSetState(string stateName)
	{
		SetState(stateName);
	}

	public void QueueState(int state)
	{
		m_stateQueued = state;
	}

	public void QueueState(string stateName)
	{
		QueueState(GetStateId(stateName));
	}

	public void QueueStateIfFound(string stateName)
	{
		int stateId = GetStateId(stateName);
		if (stateId != -1)
		{
			QueueState(stateId);
		}
	}

	public tEnum GetState<tEnum>() where tEnum : struct, IConvertible
	{
		if (m_enumToIdMap == null)
		{
			InitEnumMap<tEnum>();
			if (m_enumToIdMap == null)
			{
				return default(tEnum);
			}
		}
		if (m_state < 0)
		{
			return default(tEnum);
		}
		int num = m_idToEnumMap[m_state];
		if (num == -1)
		{
			return default(tEnum);
		}
		return (tEnum)Enum.ToObject(typeof(tEnum), num);
	}

	public bool GetInState<tEnum>(tEnum state) where tEnum : struct, IConvertible
	{
		return m_state == GetStateId(state);
	}

	public void SetState<tEnum>(tEnum enumState) where tEnum : struct, IConvertible
	{
		if (m_enumToIdMap == null)
		{
			InitEnumMap<tEnum>();
			if (m_enumToIdMap == null)
			{
				return;
			}
		}
		int num = Convert.ToInt32(enumState);
		if (m_enumToIdMap.IsIndexValid(num))
		{
			SetState(m_enumToIdMap[num]);
		}
	}

	public tEnum GetState<tEnum>(int stateId) where tEnum : struct, IConvertible
	{
		if (m_enumToIdMap == null || !m_idToEnumMap.IsIndexValid(stateId))
		{
			return default(tEnum);
		}
		int num = m_idToEnumMap[stateId];
		if (num == -1)
		{
			return default(tEnum);
		}
		return (tEnum)Enum.ToObject(typeof(tEnum), num);
	}

	protected void Start()
	{
		OnStart();
		if (m_states.Count > 0)
		{
			SetState((m_state > -1) ? m_state : 0);
		}
	}

	private void Update()
	{
		m_stateTime += Time.deltaTime;
		if (m_state >= 0 && m_actionsUpdateState != null)
		{
			m_shouldQueueStateChange = true;
			m_actionsUpdateState(m_states[m_state].m_name);
			m_shouldQueueStateChange = false;
		}
		if (m_state >= 0)
		{
			int num = OnUpdate();
			if (num != -1)
			{
				SetState(num);
			}
		}
		if (m_stateQueued != -1)
		{
			SetState(m_stateQueued);
		}
	}

	protected virtual void OnStart()
	{
	}

	protected virtual int OnUpdate()
	{
		return -1;
	}

	protected virtual void OnEnterState(int oldState, int newState, T state)
	{
	}

	private void EnterState(int oldState, int newState)
	{
		T state = m_states[newState];
		OnEnterState(oldState, newState, state);
		string stateName = GetStateName(oldState);
		string stateName2 = GetStateName(newState);
		if (m_actionsOnEnterState != null)
		{
			m_actionsOnEnterState(stateName, stateName2);
		}
	}

	private void ExitState(int oldState, int newState)
	{
		string stateName = GetStateName(oldState);
		string stateName2 = GetStateName(newState);
		if (m_actionsOnExitState != null)
		{
			m_actionsOnExitState(stateName, stateName2);
		}
	}

	private void InitEnumMap<tEnum>() where tEnum : struct, IConvertible
	{
		int[] array = (int[])Enum.GetValues(typeof(tEnum));
		string[] names = Enum.GetNames(typeof(tEnum));
		int num = array[array.Length - 1];
		m_enumToIdMap = new int[num + 1];
		m_idToEnumMap = new int[m_states.Count];
		Array.ForEach(m_idToEnumMap, delegate(int item)
		{
			item = -1;
		});
		for (int num2 = 0; num2 < array.Length; num2++)
		{
			int stateId = GetStateId(names[num2]);
			if (stateId == -1)
			{
				m_enumToIdMap[array[num2]] = -1;
				continue;
			}
			m_idToEnumMap[stateId] = array[num2];
			m_enumToIdMap[array[num2]] = stateId;
		}
	}

	private int GetStateId<tEnum>(tEnum enumState) where tEnum : struct, IConvertible
	{
		if (m_enumToIdMap == null)
		{
			InitEnumMap<tEnum>();
			if (m_enumToIdMap == null)
			{
				return -1;
			}
		}
		int num = Convert.ToInt32(enumState);
		if (m_enumToIdMap.IsIndexValid(num))
		{
			return m_enumToIdMap[num];
		}
		return -1;
	}
}
