using System;
using System.Collections.Generic;
using PowerTools;
using UnityEngine;

public class StateMachine : StateMachineBase<StateMachine.State>
{
	[Serializable]
	public class State : StateBase
	{
		[Header("On Enter")]
		public List<GameObject> m_turnOn;

		public List<GameObject> m_turnOff;

		public List<StateActionAnimate> m_animate;

		public AudioCue m_sound;

		[Header("Transition")]
		public string m_nextState = string.Empty;

		[HideInInspector]
		public int m_nextStateId = -1;

		public MinMaxRange m_transitionOnTime = new MinMaxRange(0f);

		public SpriteAnim m_transitionOnFinish;
	}

	public override float GetStateTimeRemaining()
	{
		if (m_state < 0)
		{
			return -1f;
		}
		State state = m_states[m_state];
		if (!state.m_transitionOnTime.IsZero())
		{
			return (float)state.m_transitionOnTime - m_stateTime;
		}
		return -1f;
	}

	public override float GetStateTransitionTime(string stateName)
	{
		State state = GetState(stateName);
		return (state == null) ? 0f : ((float)state.m_transitionOnTime);
	}

	protected override void OnStart()
	{
		foreach (State state in m_states)
		{
			for (int i = 0; i < state.m_animate.Count; i++)
			{
				StateActionAnimate stateActionAnimate = state.m_animate[i];
				if (stateActionAnimate.m_object != null && stateActionAnimate.m_animation != null)
				{
					stateActionAnimate.m_animatedObject = stateActionAnimate.m_object.GetComponent<SpriteAnim>();
				}
			}
			state.m_nextStateId = GetStateId(state.m_nextState);
		}
	}

	protected override int OnUpdate()
	{
		if (m_state < 0)
		{
			return -1;
		}
		int result = -1;
		bool flag = false;
		State state = m_states[m_state];
		flag |= ((float)state.m_transitionOnTime > 0f || state.m_transitionOnTime.m_hasMax) && m_stateTime > (float)state.m_transitionOnTime;
		if (flag | (state.m_transitionOnFinish != null && !state.m_transitionOnFinish.IsPlaying()))
		{
			result = state.m_nextStateId;
		}
		return result;
	}

	protected override void OnEnterState(int oldState, int newState, State state)
	{
		state.m_transitionOnTime.Randomise();
		int count = state.m_turnOn.Count;
		for (int i = 0; i < count; i++)
		{
			GameObject gameObject = state.m_turnOn[i];
			if (gameObject != null)
			{
				gameObject.SetActive(true);
			}
		}
		count = state.m_animate.Count;
		for (int j = 0; j < count; j++)
		{
			StateActionAnimate stateActionAnimate = state.m_animate[j];
			if (!string.IsNullOrEmpty(stateActionAnimate.m_state) && stateActionAnimate.m_object != null)
			{
				stateActionAnimate.m_object.SendMessage(StateMachineBase<State>.STR_MSGSETSTATE, stateActionAnimate.m_state, SendMessageOptions.DontRequireReceiver);
			}
			if (stateActionAnimate.m_animatedObject != null && stateActionAnimate.m_animation != null)
			{
				stateActionAnimate.m_animatedObject.gameObject.SetActive(true);
				if (!stateActionAnimate.m_animatedObject.IsPlaying(stateActionAnimate.m_animation))
				{
					stateActionAnimate.m_animatedObject.Play(stateActionAnimate.m_animation);
				}
			}
		}
		count = state.m_turnOff.Count;
		for (int k = 0; k < count; k++)
		{
			GameObject gameObject2 = state.m_turnOff[k];
			if (gameObject2 != null)
			{
				gameObject2.SetActive(false);
			}
		}
		if ((bool)state.m_sound)
		{
			SystemAudio.Play(state.m_sound, base.transform);
		}
	}
}
