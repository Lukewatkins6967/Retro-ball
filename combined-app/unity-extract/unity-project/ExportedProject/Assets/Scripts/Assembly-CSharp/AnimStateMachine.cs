using System;
using System.Collections.Generic;
using PowerTools;
using UnityEngine;

public class AnimStateMachine : StateMachineBase<AnimStateMachine.State>
{
	[Serializable]
	public class State : StateBase
	{
		[Header("On Enter")]
		public AnimationClip m_animation;

		public List<GameObject> m_turnOn;

		public List<GameObject> m_turnOff;

		public List<StateActionAnimate> m_animate;

		public AudioCue m_sound;

		[Header("Transition")]
		public string m_nextState = string.Empty;

		[HideInInspector]
		public int m_nextStateId = -1;

		public bool m_transitionOnFinish;

		public MinMaxRange m_transitionOnTime = new MinMaxRange(0f);
	}

	private SpriteAnim m_animComponent;

	public void SetStateAnim(int stateId, AnimationClip animation)
	{
		if (m_animComponent == null)
		{
			m_animComponent = GetComponentInChildren<SpriteAnim>();
		}
		if ((bool)animation && m_states.IsIndexValid(stateId))
		{
			m_states[stateId].m_animation = animation;
		}
	}

	public void SetStateAnim(string stateName, AnimationClip animation)
	{
		if (m_animComponent == null)
		{
			m_animComponent = GetComponentInChildren<SpriteAnim>();
		}
		int stateId = GetStateId(stateName);
		if ((bool)animation && m_states.IsIndexValid(stateId))
		{
			m_states[stateId].m_animation = animation;
		}
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
		if (state.m_transitionOnFinish && m_animComponent != null && m_animComponent.GetCurrentAnimation() != null)
		{
			return m_animComponent.GetCurrentAnimation().length - m_animComponent.GetCurrentAnimTime();
		}
		return -1f;
	}

	public override float GetStateTransitionTime(string stateName)
	{
		int stateId = GetStateId(stateName);
		if (stateId != -1)
		{
			State state = m_states[stateId];
			if (state.m_transitionOnFinish && state.m_animation != null)
			{
				return Mathf.Max(state.m_transitionOnTime, state.m_animation.length);
			}
			return state.m_transitionOnTime;
		}
		return 0f;
	}

	protected override void OnStart()
	{
		m_animComponent = GetComponentInChildren<SpriteAnim>();
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
		if (flag | (state.m_transitionOnFinish && m_animComponent != null && !m_animComponent.IsPlaying()))
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
		if (m_animComponent != null && state.m_animation != null && !m_animComponent.IsPlaying(state.m_animation))
		{
			m_animComponent.Play(state.m_animation);
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
