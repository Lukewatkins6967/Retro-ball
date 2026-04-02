using UnityEngine;

public class Basketball : MonoBehaviour
{
	public enum eState
	{
		Loose = 0,
		Held = 1,
		Pass = 2,
		Shoot = 3,
		Goal = 4
	}

	[SerializeField]
	private AnimationCurve m_rangeAccuracyCurve;

	[SerializeField]
	private AnimationCurve m_passRangeAccuracyCurve;

	[SerializeField]
	private float m_passCorrectionSpeed = 15f;

	[SerializeField]
	private float m_passCorrectionMaxSpeedMult = 1f;

	private Rigidbody m_rigidBody;

	private SpriteRenderer m_sprite;

	private ColorTinterBase m_tinter;

	private Player m_playerHolding;

	private Player m_playerPassTarget;

	private Player m_playerShooting;

	private StateMachine m_states;

	private Vector3 m_velocity = Vector3.zero;

	private float m_timeToPassTarget;

	private float m_timeToShootTarget;

	private float m_shootGroundDistance;

	private Vector3 m_passOffset = Vector2.zero;

	public void ThrowUp(Vector3 position)
	{
		m_states.SetState(eState.Loose);
		base.transform.position = position;
		m_rigidBody.velocity = Vector3.up * 5f;
	}

	public void OnGoal(Hoop hoop)
	{
		m_rigidBody.isKinematic = true;
		Vector3 hoopCenter = hoop.GetHoopCenter();
		base.transform.position = new Vector3(hoopCenter.x, base.transform.position.y, hoopCenter.z);
		m_rigidBody.position = base.transform.position;
		m_velocity.y = Mathf.Min(Singleton<Constants>.Get.m_ballThroughNetMinDownSpeed, m_velocity.y);
		float num = 0f - m_velocity.y;
		m_velocity.x = Mathf.Clamp(m_velocity.x, 0f - num, num);
		m_velocity.z = Mathf.Clamp(m_velocity.z, 0f - num, num);
		m_rigidBody.velocity = m_velocity;
		m_states.SetState(eState.Goal);
	}

	public bool CanPickUp(Player player)
	{
		if (m_states.GetInState(eState.Pass) && player == m_playerPassTarget)
		{
			return true;
		}
		return m_states.GetInState(eState.Loose);
	}

	public eState GetState()
	{
		return m_states.GetState<eState>();
	}

	public Player GetPlayerHolding()
	{
		return m_playerHolding;
	}

	public Player GetPlayerReceiving()
	{
		return m_playerPassTarget;
	}

	public Player GetPlayerShooting()
	{
		return m_playerShooting;
	}

	public Vector3 GetVelocity()
	{
		return m_velocity;
	}

	public float GetShootDistance()
	{
		return m_shootGroundDistance;
	}

	public void Dunk()
	{
		if (!(m_playerHolding == null))
		{
			m_velocity = Vector3.down * 7f;
			m_rigidBody.velocity = m_velocity;
			m_playerHolding = null;
		}
	}

	public void Drop(Vector3 velocity)
	{
		if (!(m_playerHolding == null))
		{
			m_states.SetState(eState.Loose);
			m_velocity = velocity;
			m_rigidBody.velocity = m_velocity;
			m_playerHolding = null;
		}
	}

	public void Pass(Player targetPlayer)
	{
		if (!(m_playerHolding == null))
		{
			m_states.SetState(eState.Pass);
			m_playerPassTarget = targetPlayer;
			Vector3 vector = targetPlayer.GetPassToPoint() - m_playerHolding.GetBallNode();
			float magnitude = vector.magnitude;
			vector.Normalize();
			float num = Vector2.Dot(targetPlayer.GetVelocity(), vector);
			if (Constants.Data.m_passSpeed - num < 0f)
			{
				m_timeToPassTarget = 1.5f;
			}
			else
			{
				m_timeToPassTarget = magnitude / (Constants.Data.m_passSpeed - num);
			}
			Vector3 vector2 = targetPlayer.GetBallNode() + targetPlayer.GetVelocity() * m_timeToPassTarget;
			float num2 = m_passRangeAccuracyCurve.Evaluate(magnitude);
			m_passOffset = Random.insideUnitSphere * Random.Range(0f - num2, num2);
			vector2 += m_passOffset;
			m_velocity = (vector2 - m_playerHolding.GetBallNode()).normalized * Constants.Data.m_passSpeed;
			m_velocity.y = GetVertPosToAccountForGravity(m_playerHolding.GetBallNode().y, targetPlayer.GetPassToPoint().y, m_timeToPassTarget);
			m_velocity.y = Mathf.Clamp(m_velocity.y, 0f - Constants.Data.m_passSpeed, Constants.Data.m_passSpeed);
			m_rigidBody.velocity = m_velocity;
			m_playerHolding = null;
		}
	}

	private void UpdatePassTrajectory()
	{
		if (!(m_timeToPassTarget <= 0f))
		{
			Vector3 vector = m_playerPassTarget.GetBallNode() + m_playerPassTarget.GetVelocity() * m_timeToPassTarget;
			vector += m_passOffset;
			Vector3 vector2 = base.transform.position + m_rigidBody.velocity * m_timeToPassTarget;
			Vector3 vector3 = vector.WithY(0f) - vector2.WithY(0f);
			Vector3 normalized = vector3.normalized;
			vector3 -= normalized * Vector2.Dot(m_rigidBody.velocity.normalized, vector3) * 0.25f;
			normalized = vector3.normalized;
			float num = Mathf.Min(m_passCorrectionSpeed * vector3.magnitude / m_timeToPassTarget, m_rigidBody.velocity.magnitude * m_passCorrectionMaxSpeedMult);
			m_rigidBody.AddForce(normalized * num);
		}
	}

	public static float GetVertPosToAccountForGravity(float startHeight, float targetHeight, float time)
	{
		if (time == 0f)
		{
			return 0f;
		}
		float num = targetHeight - startHeight;
		return num / time - 0.5f * Physics.gravity.y * time;
	}

	public void Pass(Vector3 direction)
	{
		m_states.SetState(eState.Loose);
		base.transform.position = m_playerHolding.GetBallNode() + direction.normalized * 1.5f;
		m_rigidBody.velocity = direction.normalized * 15f;
	}

	public void Shoot(Vector3 targetPosition)
	{
		if (!(m_playerHolding == null))
		{
			m_states.SetState(eState.Shoot);
			m_playerShooting = m_playerHolding;
			Vector3 vector = m_playerHolding.GetBallNode() + (targetPosition - m_playerHolding.GetBallNode()).normalized * 1f;
			Vector3 vector2 = targetPosition - vector;
			m_shootGroundDistance = vector2.WithY(0f).magnitude;
			float magnitude = vector2.magnitude;
			float num = m_rangeAccuracyCurve.Evaluate(magnitude);
			targetPosition += Random.insideUnitSphere * Random.Range(0f - num, num);
			m_rigidBody.velocity = FindParabolicVelocity(vector, targetPosition, (!(m_shootGroundDistance < 2.5f)) ? 0.6f : 1f, 0.6f);
			m_playerHolding = null;
		}
	}

	public bool GetBallHeld()
	{
		return m_playerHolding != null;
	}

	public void PickUp(Player plr)
	{
		m_playerHolding = plr;
		m_states.SetState(eState.Held);
	}

	public void InterceptKick(Vector3 direction, float speed)
	{
		m_states.SetState(eState.Loose);
		m_velocity += direction * speed * 0.5f;
		m_rigidBody.velocity += m_velocity;
	}

	private void Awake()
	{
		m_rigidBody = GetComponent<Rigidbody>();
		m_states = GetComponent<StateMachine>();
		m_sprite = GetComponentInChildren<SpriteRenderer>();
		m_states.RegisterCallbacks(OnEnterState, OnExitState, UpdateState);
		m_tinter = m_sprite.GetComponent<ColorTinterBase>();
	}

	private void LateUpdate()
	{
		eState state = m_states.GetState<eState>();
		if (state == eState.Held)
		{
			base.transform.position = m_playerHolding.GetBallNode();
			m_sprite.transform.position = m_playerHolding.GetBallSpriteNode();
		}
		else
		{
			m_sprite.transform.localPosition = Vector3.zero;
		}
		m_sprite.sortingOrder = SystemGame.CalcSpriteDepth(base.transform.position);
	}

	private void FixedUpdate()
	{
		switch (m_states.GetState<eState>())
		{
		case eState.Loose:
			m_velocity = m_rigidBody.velocity;
			break;
		case eState.Pass:
			UpdatePassTrajectory();
			m_timeToPassTarget -= Time.fixedDeltaTime;
			if (m_timeToPassTarget <= 0f)
			{
				m_states.SetState(eState.Loose);
			}
			break;
		case eState.Shoot:
			m_timeToShootTarget -= Time.fixedDeltaTime;
			if (m_timeToShootTarget <= 0f)
			{
				Singleton<Commentary>.Get.PlayCommentary(Commentary.eCommentaryTrigger.JumpshotMissed);
				m_states.SetState(eState.Loose);
			}
			break;
		case eState.Goal:
			m_velocity += Physics.gravity * Time.fixedDeltaTime;
			m_rigidBody.velocity = m_velocity;
			base.transform.position = base.transform.position + m_velocity * Time.fixedDeltaTime;
			m_rigidBody.position = base.transform.position;
			if (base.transform.position.y < Singleton<Constants>.Get.m_ballThroughNetHeight)
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

	private Vector3 FindParabolicVelocity(Vector3 startPosition, Vector3 finalPosition, float maxHeightOffset = 0.6f, float rangeOffset = 0.11f)
	{
		Vector3 result = default(Vector3);
		Vector3 vector = new Vector3(finalPosition.x, 0f, finalPosition.z) - new Vector3(startPosition.x, 0f, startPosition.z);
		float magnitude = vector.magnitude;
		magnitude += rangeOffset;
		Vector3 normalized = vector.normalized;
		float num = finalPosition.y + maxHeightOffset;
		if (magnitude / 2f > num)
		{
			num = magnitude / 2f;
		}
		if (num - startPosition.y <= 0f)
		{
			Vector3 vector2 = finalPosition - startPosition;
			float num2 = vector2.magnitude + rangeOffset;
			vector2.Normalize();
			float time = num2 / Constants.Data.m_aboveNetShootSpeed;
			result = vector2 * Constants.Data.m_aboveNetShootSpeed;
			result.y = GetVertPosToAccountForGravity(startPosition.y, finalPosition.y, time);
			return result;
		}
		result.y = Mathf.Sqrt(-2f * Physics.gravity.y * (num - startPosition.y));
		float num3 = Mathf.Sqrt(-2f * (num - startPosition.y) / Physics.gravity.y);
		float num4 = Mathf.Sqrt(-2f * (num - finalPosition.y) / Physics.gravity.y);
		m_timeToShootTarget = num3 + num4;
		float num5 = magnitude / m_timeToShootTarget;
		result.x = num5 * normalized.x;
		result.z = num5 * normalized.z;
		m_timeToShootTarget += 0.25f;
		return result;
	}

	private void OnEnterState(string oldState, string newState)
	{
		switch (m_states.GetState<eState>())
		{
		case eState.Shoot:
			m_tinter.StartFlash(new ColorTinterBase.FlashTintData
			{
				m_colour = Color.white,
				m_duration = 0.75f,
				m_rate = 0.15f
			});
			break;
		case eState.Loose:
			break;
		case eState.Pass:
			m_tinter.AddTint(Color.white, 0.15f);
			break;
		case eState.Held:
			m_rigidBody.isKinematic = true;
			break;
		case eState.Goal:
			break;
		}
	}

	private void OnExitState(string oldState, string newState)
	{
		switch (m_states.GetState<eState>())
		{
		case eState.Held:
			m_rigidBody.isKinematic = false;
			break;
		case eState.Pass:
			m_playerPassTarget = null;
			break;
		case eState.Goal:
			m_rigidBody.isKinematic = false;
			break;
		case eState.Shoot:
			break;
		}
	}

	private void UpdateState(string state)
	{
	}
}
