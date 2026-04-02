using System;
using UnityEngine;

public class Weapon : MonoBehaviour
{
	public enum eState
	{
		Loose = 0,
		Held = 1,
		Throw = 2
	}

	[SerializeField]
	private float m_damage = 1f;

	[SerializeField]
	private float m_cooldown = 0.5f;

	[SerializeField]
	private float m_throwSpeed = 20f;

	[SerializeField]
	private float m_spawnChance = 1f;

	private Rigidbody m_rigidBody;

	private SpriteRenderer m_sprite;

	private ColorTinterBase m_tinter;

	private Player m_playerHolding;

	private Player m_playerPassTarget;

	private StateMachine m_states;

	private Vector3 m_velocity = Vector3.zero;

	private float m_timeToPassTarget;

	private Vector2 m_initialSpriteOffset = Vector2.zero;

	public float GetSpawnChance()
	{
		return m_spawnChance;
	}

	public float GetDamage()
	{
		return m_damage;
	}

	public float GetCooldown()
	{
		return m_cooldown;
	}

	public bool CanPickUp(Player player)
	{
		return m_states.GetInState(eState.Loose);
	}

	public eState GetState()
	{
		return m_states.GetState<eState>();
	}

	public bool GetHeld()
	{
		return m_playerHolding != null;
	}

	public Player GetPlayerHolding()
	{
		return m_playerHolding;
	}

	public Player GetPlayerReceiving()
	{
		return m_playerPassTarget;
	}

	public Vector3 GetVelocity()
	{
		return m_velocity;
	}

	public void PickUp(Player plr)
	{
		m_playerHolding = plr;
		m_states.SetState(eState.Held);
	}

	public void Drop(Vector3 velocity)
	{
		if (!(m_playerHolding == null))
		{
			m_states.SetState(eState.Loose);
			m_velocity = velocity;
			m_rigidBody.velocity = m_velocity;
			AddRandomSpin();
			m_playerHolding = null;
		}
	}

	private void AddRandomSpin()
	{
		float num = UnityEngine.Random.Range((float)Math.PI * 3f, (float)Math.PI * 10f);
		if (UnityEngine.Random.value < 0.5f)
		{
			num = 0f - num;
		}
		m_rigidBody.maxAngularVelocity = 100000f;
		m_rigidBody.angularVelocity = Vector3.zero.WithZ(num);
	}

	public void Throw(Vector3 direction, float distance)
	{
		if (!(m_playerHolding == null))
		{
			m_states.SetState(eState.Throw);
			m_timeToPassTarget = distance / m_throwSpeed;
			m_velocity = direction.normalized * m_throwSpeed;
			m_velocity.y = Basketball.GetVertPosToAccountForGravity(m_playerHolding.GetWeaponNode().y, m_playerHolding.GetWeaponNode().y, m_timeToPassTarget);
			m_rigidBody.velocity = m_velocity;
			AddRandomSpin();
			m_playerHolding = null;
		}
	}

	public void Throw(Player targetPlayer)
	{
		if (!(m_playerHolding == null))
		{
			m_states.SetState(eState.Throw);
			m_playerPassTarget = targetPlayer;
			Vector3 weaponNode = m_playerHolding.GetWeaponNode();
			weaponNode.y = Mathf.Max(1f, weaponNode.y);
			Vector3 vector = targetPlayer.GetPassToPoint() - m_playerHolding.GetWeaponNode();
			float magnitude = vector.magnitude;
			vector.Normalize();
			float num = Vector2.Dot(targetPlayer.GetVelocity(), vector);
			if (m_throwSpeed - num < 0f)
			{
				m_timeToPassTarget = 1.5f;
			}
			else
			{
				m_timeToPassTarget = magnitude / (m_throwSpeed - num);
			}
			Vector3 vector2 = targetPlayer.GetWeaponNode() + targetPlayer.GetVelocity() * m_timeToPassTarget;
			float num2 = Constants.Data.m_weaponThrowRangeAccuracyCurve.Evaluate(magnitude);
			vector2 += UnityEngine.Random.insideUnitSphere * UnityEngine.Random.Range(0f - num2, num2);
			m_velocity = (vector2 - m_playerHolding.GetWeaponNode()).normalized * m_throwSpeed;
			m_velocity.y = Basketball.GetVertPosToAccountForGravity(m_playerHolding.GetWeaponNode().y, m_playerPassTarget.GetWeaponNode().y + 0.25f, m_timeToPassTarget);
			m_velocity.y = Mathf.Clamp(m_velocity.y, 0f - m_throwSpeed, m_throwSpeed);
			m_rigidBody.velocity = m_velocity;
			AddRandomSpin();
			m_timeToPassTarget += 0.25f;
			m_playerHolding = null;
		}
	}

	public bool CanDamage(Player player)
	{
		if (m_states.GetInState(eState.Throw))
		{
			return player == m_playerPassTarget;
		}
		return false;
	}

	private void ThrowInFromSide()
	{
		Quaternion quaternion = Quaternion.Euler(new Vector3(0f, UnityEngine.Random.Range(0, 4) * 90, 0f));
		Vector3 vector = quaternion * new Vector3(1f, UnityEngine.Random.Range(0f, 1f), UnityEngine.Random.value * 2f - 1f);
		vector.Scale(new Vector3(20f, 1f, 14f));
		vector.y += 1f;
		Vector3 vector2 = quaternion * new Vector3(UnityEngine.Random.Range(0f, 1f), 0f, UnityEngine.Random.Range(-0.75f, 0.75f));
		vector2.Scale(new Vector3(11f, 1f, 5.5f));
		base.transform.position = vector;
		Vector3 vector3 = (vector2 - vector).WithY(0f);
		float magnitude = vector3.magnitude;
		vector3.Normalize();
		m_states.SetState(eState.Throw);
		float num = 12f;
		m_timeToPassTarget = magnitude / num;
		m_velocity = vector3.normalized * num;
		m_velocity.y = Basketball.GetVertPosToAccountForGravity(vector.y, vector2.y, m_timeToPassTarget);
		m_rigidBody.velocity = m_velocity;
		base.gameObject.layer = 16;
		AddRandomSpin();
	}

	private void Awake()
	{
		m_rigidBody = GetComponent<Rigidbody>();
		m_sprite = GetComponentInChildren<SpriteRenderer>();
		m_tinter = m_sprite.GetComponent<ColorTinterBase>();
		m_states = GetComponent<StateMachine>();
		m_sprite = GetComponentInChildren<SpriteRenderer>();
		StateMachine states = m_states;
		states.m_actionsOnEnterState = (Action<string, string>)Delegate.Combine(states.m_actionsOnEnterState, new Action<string, string>(OnEnterState));
		StateMachine states2 = m_states;
		states2.m_actionsOnExitState = (Action<string, string>)Delegate.Combine(states2.m_actionsOnExitState, new Action<string, string>(OnExitState));
		m_initialSpriteOffset = m_sprite.transform.localPosition;
	}

	private void Start()
	{
		ThrowInFromSide();
	}

	private void FixedUpdate()
	{
		switch (GetState())
		{
		case eState.Loose:
			m_velocity = m_rigidBody.velocity;
			break;
		case eState.Throw:
			if (m_playerPassTarget != null && base.gameObject.layer != 17 && ((Vector2)base.transform.position - (Vector2)m_playerPassTarget.transform.position).sqrMagnitude < 2.25f)
			{
				base.gameObject.layer = 17;
			}
			m_timeToPassTarget -= Time.fixedDeltaTime;
			if (m_timeToPassTarget <= 0f)
			{
				m_states.SetState(eState.Loose);
			}
			break;
		}
		if (!m_states.GetInState(eState.Held))
		{
			if (base.transform.position.x < -20f)
			{
				base.transform.position = base.transform.position.WithX(-14f);
				m_rigidBody.position = base.transform.position;
			}
			if (base.transform.position.x > 20f)
			{
				base.transform.position = base.transform.position.WithX(14f);
				m_rigidBody.position = base.transform.position;
			}
			if (base.transform.position.y < -1f)
			{
				base.transform.position = base.transform.position.WithY(1f);
				m_rigidBody.position = base.transform.position;
			}
			if (base.transform.position.y > 11f)
			{
				base.transform.position = base.transform.position.WithY(7f);
				m_rigidBody.position = base.transform.position;
			}
			if (base.transform.position.z < -8f)
			{
				base.transform.position = base.transform.position.WithZ(-7f);
				m_rigidBody.position = base.transform.position;
			}
			if (base.transform.position.z > 8f)
			{
				base.transform.position = base.transform.position.WithZ(7f);
				m_rigidBody.position = base.transform.position;
			}
		}
	}

	private void LateUpdate()
	{
		eState state = GetState();
		if (state == eState.Held)
		{
			base.transform.position = m_playerHolding.GetWeaponNode();
			Vector3 weaponRotationNode = m_playerHolding.GetWeaponRotationNode();
			Vector2 vector = weaponRotationNode - base.transform.position;
			bool flipped = m_playerHolding.GetFlipped();
			float num = Utils.NormalizeMag(ref vector);
			float num2 = 0f;
			if (num > 0f)
			{
				num2 = Utils.GetDirectionAngle(vector);
			}
			if (flipped)
			{
				num2 -= 180f;
			}
			base.transform.eulerAngles = Vector3.zero.WithZ(num2);
			base.transform.Translate(-m_initialSpriteOffset.WithZ(0f));
			if (flipped)
			{
				base.transform.localScale = new Vector3(-1f, 1f, 1f);
			}
			else
			{
				base.transform.localScale = new Vector3(1f, 1f, 1f);
			}
			m_sprite.transform.position = m_playerHolding.GetWeaponSpriteNode();
		}
		else
		{
			m_sprite.transform.localPosition = m_initialSpriteOffset;
		}
		m_sprite.sortingOrder = SystemGame.CalcSpriteDepth(base.transform.position);
	}

	private void OnEnterState(string oldState, string newState)
	{
		eState state = m_states.GetState<eState>();
		if (state == eState.Held)
		{
			m_rigidBody.isKinematic = true;
		}
	}

	private void OnExitState(string oldState, string newState)
	{
		switch (m_states.GetState<eState>())
		{
		case eState.Held:
			m_rigidBody.isKinematic = false;
			break;
		case eState.Throw:
			m_playerPassTarget = null;
			if (oldState != newState)
			{
				base.gameObject.layer = 15;
			}
			break;
		}
	}
}
